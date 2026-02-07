import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";
import {
  isProfessionId,
  isRegulatedProfession,
  legacyMarketplaceProfessionFromProfessionId,
  type LegacyMarketplaceProfession,
} from "@/lib/professions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfilePayload = {
  status?: "DRAFT" | "PUBLISHED" | "SUSPENDED";
  // Legacy (V1)
  profession?: LegacyMarketplaceProfession;
  // V2
  primaryProfessionId?: string | null;
  secondaryProfessionIds?: string[];
  headline?: string | null;
  organization?: string | null;
  country?: string;
  city?: string;
  languages?: string[];
  themes?: string[];
  specialties?: string[];
  services?: string[];
  targetAudiences?: string[];
  format?: "VISIO" | "IN_PERSON" | "BOTH";
  responseTime?: "H24" | "H48" | "H72" | null;
  licenseNumber?: string | null;
  licenseAuthority?: string | null;
  proofUrl?: string | null;
  bioShort?: string | null;
  bioLong?: string | null;

  employerDetails?: string | null;
  pricingMode?: "FREE" | "PAID";
  price30Min?: number | null;
  price60Min?: number | null;
  availability?: unknown | null;
  complianceAccepted?: boolean;
  accuracyConfirmed?: boolean;
};

function primaryProfessionIdFromLegacy(legacy: LegacyMarketplaceProfession) {
  switch (legacy) {
    case "IMMIGRATION_CONSULTANT":
      return "profession.immigration.rcic";
    case "IMMIGRATION_LAWYER":
      return "profession.law.immigration_lawyer";
    case "ORIENTATION_COUNSELOR":
      return "profession.immigration.orientation_counselor";
    case "ACADEMIC_COUNSELOR":
      return "profession.studies.school_guidance_counselor";
    case "EMPLOYMENT_COUNSELOR":
      return "profession.employment.employment_counselor";
    case "CASE_MANAGER":
      return "profession.admin.case_manager";
    case "CERTIFIED_TRANSLATOR":
      return "profession.legacy.certified_translator";
    case "INTEGRATION_COACH":
      return "profession.integration.settlement_advisor";
    case "COMMUNITY_ORG":
      return "profession.legacy.community_org";
    default:
      return "profession.immigration.orientation_counselor";
  }
}

function professionIdsFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
}

function clampText(value: string | undefined | null, max: number) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function stringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeMarketplaceServices(values: unknown) {
  const MAX = 60;
  const raw = stringArray(values, MAX);

  // Domaine = utilisé pour le matching "needs" (ancien mécanisme).
  const domains = [
    "service.orientation",
    "service.immigration",
    "service.etudes",
    "service.travail",
    "service.employeur",
    "service.entrepreneuriat",
    "service.documents",
    "service.budget",
    "service.famille",
    "service.integration",
    "service.formation",
  ] as const;

  const domainSet = new Set<string>();
  for (const v of raw) {
    for (const d of domains) {
      if (v === d || v.startsWith(`${d}.`)) domainSet.add(d);
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();

  // On met les domaines en premier, pour garantir le matching même si MAX est atteint.
  for (const d of domains) {
    if (domainSet.has(d) && !seen.has(d)) {
      out.push(d);
      seen.add(d);
    }
  }

  for (const v of raw) {
    if (!seen.has(v)) {
      out.push(v);
      seen.add(v);
    }
  }

  return out.slice(0, MAX);
}

export async function GET() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const profile = await prisma.marketplaceProfile.findUnique({
    where: { userId: auth.viewer.id },
    select: {
      id: true,
      userId: true,
      status: true,
      isVerified: true,
      profession: true,
      primaryProfessionId: true,
      secondaryProfessionIdsJson: true,
      headline: true,
      organization: true,
      country: true,
      city: true,
      languagesJson: true,
      themesJson: true,
      specialtiesJson: true,
      servicesJson: true,
      targetAudiencesJson: true,
      availabilityJson: true,
      format: true,
      responseTime: true,
      licenseNumber: true,
      licenseAuthority: true,
      proofUrl: true,
      bioShort: true,
      bioLong: true,

      employerDetails: true,
      pricingMode: true,
      price30Min: true,
      price60Min: true,
      updatedAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json({
      profile: null,
      viewer: { fullName: auth.viewer.fullName, avatarUrl: auth.viewer.avatarUrl },
    });
  }

  const jsonStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

  const primaryProfessionId =
    (profile.primaryProfessionId && isProfessionId(profile.primaryProfessionId)
      ? profile.primaryProfessionId
      : null) ?? primaryProfessionIdFromLegacy(profile.profession);
  const secondaryProfessionIds = professionIdsFromJson(profile.secondaryProfessionIdsJson).filter(
    (id) => isProfessionId(id) && id !== primaryProfessionId,
  );

  return NextResponse.json({
    profile: {
      ...profile,
      primaryProfessionId,
      secondaryProfessionIds,
      languages: jsonStringArray(profile.languagesJson),
      themes: jsonStringArray(profile.themesJson),
      specialties: jsonStringArray(profile.specialtiesJson),
      services: jsonStringArray(profile.servicesJson),
      targetAudiences: jsonStringArray(profile.targetAudiencesJson),
      availability: profile.availabilityJson ?? null,
      employerDetails: profile.employerDetails ?? null,
      updatedAt: profile.updatedAt.toISOString(),
    },
    viewer: { fullName: auth.viewer.fullName, avatarUrl: auth.viewer.avatarUrl },
  });
}

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as ProfilePayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  // conformité minimale
  if (!body.complianceAccepted) {
    return NextResponse.json(
      { error: "Vous devez accepter l’engagement de transparence." },
      { status: 400 },
    );
  }
  if (!body.accuracyConfirmed) {
    return NextResponse.json(
      { error: "Vous devez confirmer l’exactitude des informations." },
      { status: 400 },
    );
  }

  const profession = body.profession;
  const country = (body.country ?? "").trim();
  const city = (body.city ?? "").trim();

  const primaryProfessionIdRaw = (body.primaryProfessionId ?? "").trim();
  const primaryProfessionId =
    (primaryProfessionIdRaw && isProfessionId(primaryProfessionIdRaw)
      ? primaryProfessionIdRaw
      : null) ?? (profession ? primaryProfessionIdFromLegacy(profession) : null);

  if (!primaryProfessionId) {
    return NextResponse.json({ error: "Métier requis." }, { status: 400 });
  }

  const secondaryProfessionIds = stringArray(body.secondaryProfessionIds, 8)
    .filter((id) => isProfessionId(id))
    .filter((id) => id !== primaryProfessionId);

  if (!country) {
    return NextResponse.json({ error: "Pays requis." }, { status: 400 });
  }
  if (!city) {
    return NextResponse.json({ error: "Ville requise." }, { status: 400 });
  }

  const languages = stringArray(body.languages, 12);
  if (!languages.length) {
    return NextResponse.json({ error: "Au moins une langue est requise." }, { status: 400 });
  }

  const requestedStatus = body.status ?? "DRAFT";

  const selectedProfessionIds = [primaryProfessionId, ...secondaryProfessionIds];
  const hasRegulatedProfession = selectedProfessionIds.some((id) => isRegulatedProfession(id));

  const normalizedLicenseNumber = clampText(body.licenseNumber, 80);
  const normalizedLicenseAuthority = clampText(body.licenseAuthority, 80);
  const normalizedProofUrl = clampText(body.proofUrl, 300);

  if (hasRegulatedProfession && requestedStatus === "PUBLISHED") {
    if (!normalizedLicenseNumber || !normalizedLicenseAuthority || !normalizedProofUrl) {
      return NextResponse.json(
        {
          error:
            "Ce métier est réglementé : licence + autorité + preuve sont requises, et la publication est bloquée jusqu’à validation admin.",
        },
        { status: 400 },
      );
    }
  }

  const availabilityJson =
    body.availability === undefined ? undefined : body.availability ?? Prisma.DbNull;

  const services = normalizeMarketplaceServices(body.services);

  const existing = await prisma.marketplaceProfile.findUnique({
    where: { userId: auth.viewer.id },
    select: {
      id: true,
      profession: true,
      primaryProfessionId: true,
      secondaryProfessionIdsJson: true,
      verificationStatus: true,
      isVerified: true,
      verifiedAt: true,
      verifiedById: true,
      rejectionReason: true,
    },
  });

  const existingPrimary =
    (existing?.primaryProfessionId && isProfessionId(existing.primaryProfessionId)
      ? existing.primaryProfessionId
      : null) ?? (existing ? primaryProfessionIdFromLegacy(existing.profession) : null);
  const existingSecondary = existing
    ? professionIdsFromJson(existing.secondaryProfessionIdsJson).filter((id) => isProfessionId(id))
    : [];

  const professionsChanged =
    !existing ||
    existingPrimary !== primaryProfessionId ||
    existingSecondary.length !== secondaryProfessionIds.length ||
    existingSecondary.some((id) => !secondaryProfessionIds.includes(id)) ||
    secondaryProfessionIds.some((id) => !existingSecondary.includes(id));

  const legacyProfession = legacyMarketplaceProfessionFromProfessionId(primaryProfessionId);

  // Règle CAPITUNE: métier principal/secondaires validés par admin.
  // -> Toute modification des métiers renvoie le profil en DRAFT (non public) + PENDING.
  // -> Les métiers réglementés ne peuvent pas être publiés avant validation.
  const existingVerificationStatus = existing?.verificationStatus ?? "DRAFT";
  const needsAdminValidation =
    professionsChanged || (hasRegulatedProfession && existingVerificationStatus !== "VERIFIED");

  const status =
    requestedStatus === "SUSPENDED" ? "SUSPENDED" : needsAdminValidation ? "DRAFT" : requestedStatus;

  const verificationResetData =
    professionsChanged
      ? {
          verificationStatus: "PENDING" as const,
          isVerified: false,
          verifiedAt: null,
          verifiedById: null,
          rejectionReason: null,
        }
      : {};

  const profile = await prisma.marketplaceProfile.upsert({
    where: { userId: auth.viewer.id },
    update: {
      status,
      profession: legacyProfession,
      primaryProfessionId,
      secondaryProfessionIdsJson: secondaryProfessionIds,
      headline: clampText(body.headline, 120),
      organization: clampText(body.organization, 120),
      country,
      city,
      languagesJson: languages,
      themesJson: stringArray(body.themes, 12),
      specialtiesJson: stringArray(body.specialties, 24),
      servicesJson: services,
      targetAudiencesJson: stringArray(body.targetAudiences, 12),
      availabilityJson,
      format: body.format ?? "VISIO",
      responseTime: body.responseTime ?? null,
      licenseNumber: normalizedLicenseNumber,
      licenseAuthority: normalizedLicenseAuthority,
      proofUrl: normalizedProofUrl,
      bioShort: clampText(body.bioShort, 300),
      bioLong: clampText(body.bioLong, 1000),

      employerDetails: clampText(body.employerDetails, 2000),
      pricingMode: body.pricingMode ?? "FREE",
      price30Min: body.price30Min ?? null,
      price60Min: body.price60Min ?? null,

      ...verificationResetData,
    },
    create: {
      userId: auth.viewer.id,
      status,
      profession: legacyProfession,
      primaryProfessionId,
      secondaryProfessionIdsJson: secondaryProfessionIds,
      headline: clampText(body.headline, 120),
      organization: clampText(body.organization, 120),
      country,
      city,
      languagesJson: languages,
      themesJson: stringArray(body.themes, 12),
      specialtiesJson: stringArray(body.specialties, 24),
      servicesJson: services,
      targetAudiencesJson: stringArray(body.targetAudiences, 12),
      availabilityJson,
      format: body.format ?? "VISIO",
      responseTime: body.responseTime ?? null,
      licenseNumber: normalizedLicenseNumber,
      licenseAuthority: normalizedLicenseAuthority,
      proofUrl: normalizedProofUrl,
      bioShort: clampText(body.bioShort, 300),
      bioLong: clampText(body.bioLong, 1000),

      employerDetails: clampText(body.employerDetails, 2000),
      pricingMode: body.pricingMode ?? "FREE",
      price30Min: body.price30Min ?? null,
      price60Min: body.price60Min ?? null,

      verificationStatus: "PENDING",
      isVerified: false,
    },
    select: { id: true, status: true, updatedAt: true },
  });

  return NextResponse.json({
    ok: true,
    profile: { id: profile.id, status: profile.status, updatedAt: profile.updatedAt.toISOString() },
  });
}

export async function DELETE() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  try {
    await prisma.marketplaceProfile.delete({ where: { userId: auth.viewer.id } });
  } catch (e) {
    // Profil déjà supprimé : ok (idempotent)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ ok: true });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
