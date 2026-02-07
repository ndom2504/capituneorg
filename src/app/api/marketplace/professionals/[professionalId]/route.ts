import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { jsonStringArray } from "@/app/api/marketplace/_viewer";

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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ professionalId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { professionalId } = await context.params;

  const profile = await prisma.marketplaceProfile.findFirst({
    where: {
      userId: professionalId,
      status: "PUBLISHED",
      user: { is: { accountType: "PROFESSIONAL", isCertified: true } },
    },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true, isCertified: true } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      professionalId: profile.userId,
      profileId: profile.id,
      fullName: profile.user.fullName,
      avatarUrl: profile.user.avatarUrl,
      isCertified: profile.user.isCertified,
      profession: profile.profession,
      professionLabel: professionLabel(profile.profession),
      headline: profile.headline,
      organization: profile.organization,
      country: profile.country,
      city: profile.city,
      languages: jsonStringArray(profile.languagesJson),
      themes: jsonStringArray(profile.themesJson),
      specialties: jsonStringArray(profile.specialtiesJson),
      services: jsonStringArray(profile.servicesJson),
      targetAudiences: jsonStringArray(profile.targetAudiencesJson),
      format: profile.format,
      responseTime: profile.responseTime,
      isVerified: profile.isVerified, // Legacy
      verificationStatus: profile.verificationStatus,
      badges: Array.isArray(profile.badgesJson) ? profile.badgesJson : null,
      bioShort: profile.bioShort,
      bioLong: profile.bioLong,
      employerDetails: profile.employerDetails ?? null,
      pricingMode: profile.pricingMode,
      price30Min: profile.price30Min,
      price60Min: profile.price60Min,
      availability: profile.availabilityJson ?? null,
    },
  });
}
