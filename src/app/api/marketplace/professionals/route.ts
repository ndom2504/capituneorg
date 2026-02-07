import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { jsonStringArray } from "@/app/api/marketplace/_viewer";
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
  switch (p) {
    case "IMMIGRATION_CONSULTANT":
      return "Consultant immigration";
    case "IMMIGRATION_LAWYER":
      return "Avocat immigration";
    case "ORIENTATION_COUNSELOR":
      return "Conseiller orientation";
    case "ACADEMIC_COUNSELOR":
      return "Conseiller académique";
    case "EMPLOYMENT_COUNSELOR":
      return "Conseiller emploi";
    case "CASE_MANAGER":
      return "Gestionnaire de dossier";
    case "CERTIFIED_TRANSLATOR":
      return "Traducteur agréé";
    case "INTEGRATION_COACH":
      return "Coach intégration";
    case "COMMUNITY_ORG":
      return "Organisme communautaire";
    default:
      return p;
  }
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

  const selectedNeeds: NeedId[] = (needsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v): v is NeedId => isNeedId(v));

  type FindManyArgs = NonNullable<Parameters<typeof prisma.marketplaceProfile.findMany>[0]>;
  const where: FindManyArgs["where"] = {
    status: "PUBLISHED",
    ...(profession ? { profession: profession as never } : {}),
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
    ...(format ? { format: format as never } : {}),
    ...(verified === "true" ? { isVerified: true } : {}),
    user: { is: { accountType: "PROFESSIONAL", isCertified: true } },
  };

  const profiles = await prisma.marketplaceProfile.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }],
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
        profession: p.profession,
        professionLabel: professionLabel(p.profession),
        headline: p.headline,
        organization: p.organization,
        country: p.country,
        city: p.city,
        languages,
        themes,
        specialties,
        services: servicesRaw,
        isVerified: p.isVerified, // Legacy
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
