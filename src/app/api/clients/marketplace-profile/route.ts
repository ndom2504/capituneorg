import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfilePayload = {
  status?: "DRAFT" | "PUBLISHED" | "SUSPENDED";
  profession?:
    | "IMMIGRATION_CONSULTANT"
    | "IMMIGRATION_LAWYER"
    | "ORIENTATION_COUNSELOR"
    | "ACADEMIC_COUNSELOR"
    | "EMPLOYMENT_COUNSELOR"
    | "CASE_MANAGER"
    | "CERTIFIED_TRANSLATOR"
    | "INTEGRATION_COACH"
    | "COMMUNITY_ORG";
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

  return NextResponse.json({
    profile: {
      ...profile,
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

  if (!profession) {
    return NextResponse.json({ error: "Métier requis." }, { status: 400 });
  }
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

  const status = body.status ?? "DRAFT";

  const availabilityJson =
    body.availability === undefined ? undefined : body.availability ?? Prisma.DbNull;

  const profile = await prisma.marketplaceProfile.upsert({
    where: { userId: auth.viewer.id },
    update: {
      status,
      profession,
      headline: clampText(body.headline, 120),
      organization: clampText(body.organization, 120),
      country,
      city,
      languagesJson: languages,
      themesJson: stringArray(body.themes, 12),
      specialtiesJson: stringArray(body.specialties, 24),
      servicesJson: stringArray(body.services, 24),
      targetAudiencesJson: stringArray(body.targetAudiences, 12),
      availabilityJson,
      format: body.format ?? "VISIO",
      responseTime: body.responseTime ?? null,
      licenseNumber: clampText(body.licenseNumber, 80),
      licenseAuthority: clampText(body.licenseAuthority, 80),
      proofUrl: clampText(body.proofUrl, 300),
      bioShort: clampText(body.bioShort, 300),
      bioLong: clampText(body.bioLong, 1000),

      employerDetails: clampText(body.employerDetails, 2000),
      pricingMode: body.pricingMode ?? "FREE",
      price30Min: body.price30Min ?? null,
      price60Min: body.price60Min ?? null,
    },
    create: {
      userId: auth.viewer.id,
      status,
      profession,
      headline: clampText(body.headline, 120),
      organization: clampText(body.organization, 120),
      country,
      city,
      languagesJson: languages,
      themesJson: stringArray(body.themes, 12),
      specialtiesJson: stringArray(body.specialties, 24),
      servicesJson: stringArray(body.services, 24),
      targetAudiencesJson: stringArray(body.targetAudiences, 12),
      availabilityJson,
      format: body.format ?? "VISIO",
      responseTime: body.responseTime ?? null,
      licenseNumber: clampText(body.licenseNumber, 80),
      licenseAuthority: clampText(body.licenseAuthority, 80),
      proofUrl: clampText(body.proofUrl, 300),
      bioShort: clampText(body.bioShort, 300),
      bioLong: clampText(body.bioLong, 1000),

      employerDetails: clampText(body.employerDetails, 2000),
      pricingMode: body.pricingMode ?? "FREE",
      price30Min: body.price30Min ?? null,
      price60Min: body.price60Min ?? null,
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
