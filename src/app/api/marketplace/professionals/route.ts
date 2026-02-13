import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { jsonStringArray } from "@/app/api/marketplace/_viewer";
import {
  isProfessionId,
  professionLabel as professionLabelFromTaxonomy,
  type LegacyMarketplaceProfession,
} from "@/lib/professions";
import {
  isNeedId,
  isServiceId,
  needsToServiceDomains,
  type NeedId,
  type ServiceId,
} from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function professionLabel(p: string) {
  return professionLabelFromTaxonomy(p);
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const profession = url.searchParams.get("profession");
  const country = url.searchParams.get("country");
  const city = url.searchParams.get("city");
  const format = url.searchParams.get("format");
  const verified = url.searchParams.get("verified");
  const needsParam = url.searchParams.get("needs");
  const servicesParam = url.searchParams.get("services");

  const selectedNeeds: NeedId[] = (needsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v): v is NeedId => isNeedId(v));

  const selectedServices: string[] = (servicesParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  type FindManyArgs = NonNullable<Parameters<typeof prisma.professionalProfile.findMany>[0]>;
  const where: FindManyArgs["where"] = {
    status: "PUBLISHED",
    ...(profession
      ? profession.startsWith("profession.") && isProfessionId(profession)
        ? {
            OR: [
              { primaryProfessionId: profession },
              // JSON array (métiers secondaires)
              { secondaryProfessionIdsJson: { array_contains: [profession] } as never },
            ],
          }
        : { profession: profession as unknown as LegacyMarketplaceProfession }
      : {}),
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
    ...(format ? { format: format as never } : {}),
    ...(verified === "true" ? { verificationStatus: "VERIFIED" } : {}),
    user: { is: { accountType: "PROFESSIONAL" } },
  };

  const profiles = await prisma.professionalProfile.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: [{ verificationStatus: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  const items = profiles
    .map((p) => {
      const languages = jsonStringArray(p.languagesJson);
      const themes = jsonStringArray(p.themesJson);
      const specialties = jsonStringArray(p.specialtiesJson);
      const servicesRaw = jsonStringArray(p.servicesJson);
      const services = servicesRaw.filter((s): s is ServiceId => isServiceId(s));

      let matchScore: number | null = null;
      let matchedNeeds: NeedId[] = [];
      let matchedServices: ServiceId[] = [];

      if (selectedNeeds.length) {
        const serviceSet = new Set<ServiceId>(services);
        const expected = needsToServiceDomains(selectedNeeds);
        matchedNeeds = selectedNeeds.filter((n, idx) => serviceSet.has(expected[idx]));
        matchedServices = expected.filter((svc, idx) => serviceSet.has(svc) && !!selectedNeeds[idx]);
        matchScore = matchedNeeds.length / selectedNeeds.length;
      }

      return {
        professionalId: p.userId,
        profileId: p.id,
        fullName: p.user.fullName,
        avatarUrl: p.user.avatarUrl,
        profession: p.primaryProfessionId ?? p.profession,
        professionLabel: professionLabel(p.primaryProfessionId ?? p.profession),
        headline: p.headline,
        organization: p.organization,
        country: p.country,
        city: p.city,
        languages,
        themes,
        specialties,
        services: servicesRaw,
        verificationStatus: p.verificationStatus,
        badges: Array.isArray(p.badgesJson) ? p.badgesJson : null,
        format: p.format,
        pricingMode: p.pricingMode,
        price30Min: p.price30Min,
        price60Min: p.price60Min,
        bioShort: p.bioShort,
        matchScore,
        matchedNeeds,
        matchedServices,
      };
    })
    .filter((it) => {
      if (!selectedServices.length) return true;
      const set = new Set(it.services);
      return selectedServices.some((svc) => set.has(svc));
    })
    .filter((it) => {
      if (!q) return true;
      const hay = [
        it.fullName,
        it.professionLabel,
        it.headline,
        it.organization,
        it.city,
        it.country,
        it.languages.join(" "),
        it.themes.join(" "),
        it.specialties.join(" "),
        it.bioShort,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      // si un matching est demandé, on pousse les plus pertinents en premier
      const as = typeof a.matchScore === "number" ? a.matchScore : -1;
      const bs = typeof b.matchScore === "number" ? b.matchScore : -1;
      if (bs !== as) return bs - as;
      return 0;
    });

  return NextResponse.json({ items });
}
