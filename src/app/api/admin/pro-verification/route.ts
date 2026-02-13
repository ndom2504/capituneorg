import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import {
  isProfessionId,
  isRegulatedProfession,
  professionLabel,
  type LegacyMarketplaceProfession,
} from "@/lib/professions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProVerificationAction = "VERIFY" | "REJECT" | "SUSPEND";

type ProVerificationBody = {
  action: ProVerificationAction;
  profileId: string;
  reason?: string;
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

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
}

function normalizeBadges(value: unknown): Array<"VERIFIED" | "PARTNER" | "TOP_CONTRIBUTOR" | "REGULATED_PROFESSION" | "EXPERT"> {
  const allowed = new Set(["VERIFIED", "PARTNER", "TOP_CONTRIBUTOR", "REGULATED_PROFESSION", "EXPERT"] as const);
  const arr = Array.isArray(value) ? value : [];
  const out: Array<"VERIFIED" | "PARTNER" | "TOP_CONTRIBUTOR" | "REGULATED_PROFESSION" | "EXPERT"> = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    if (allowed.has(s as any) && !out.includes(s as any)) out.push(s as any);
  }
  return out;
}

type BadgeType = ReturnType<typeof normalizeBadges>[number];

export async function GET(req: Request) {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const summary = url.searchParams.get("summary") === "1";
  if (summary) {
    const pendingCount = await prisma.professionalProfile.count({
      where: { verificationStatus: "PENDING" },
    });

    return NextResponse.json({ pendingCount });
  }

  const items = await prisma.professionalProfile.findMany({
    where: { verificationStatus: "PENDING" },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      userId: true,
      profession: true,
      primaryProfessionId: true,
      secondaryProfessionIdsJson: true,
      organization: true,
      headline: true,
      country: true,
      city: true,
      licenseNumber: true,
      licenseAuthority: true,
      proofUrl: true,
      idProofUrl: true,
      verificationRequestedAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: items.map((p) => ({
      primaryProfessionId:
        (p.primaryProfessionId && isProfessionId(p.primaryProfessionId) ? p.primaryProfessionId : null) ??
        primaryProfessionIdFromLegacy(p.profession as LegacyMarketplaceProfession),
      secondaryProfessionIds: jsonStringArray(p.secondaryProfessionIdsJson).filter((id) => isProfessionId(id)),
      id: p.id,
      userId: p.userId,
      fullName: p.user.fullName,
      email: p.user.email,
      avatarUrl: p.user.avatarUrl,
      profession: professionLabel(
        (p.primaryProfessionId && isProfessionId(p.primaryProfessionId) ? p.primaryProfessionId : null) ??
          primaryProfessionIdFromLegacy(p.profession as LegacyMarketplaceProfession),
      ),
      organization: p.organization,
      headline: p.headline,
      country: p.country,
      city: p.city,
      licenseNumber: p.licenseNumber,
      licenseAuthority: p.licenseAuthority,
      proofUrl: p.proofUrl,
      idProofUrl: p.idProofUrl,
      verificationRequestedAt: p.verificationRequestedAt ? p.verificationRequestedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: ProVerificationBody | null = null;
  try {
    body = (await req.json()) as ProVerificationBody;
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json({ error: "Body requis." }, { status: 400 });
  }

  if (!body.profileId) {
    return NextResponse.json({ error: "profileId requis." }, { status: 400 });
  }

  if (body.action !== "VERIFY" && body.action !== "REJECT" && body.action !== "SUSPEND") {
    return NextResponse.json({ error: "action invalide." }, { status: 400 });
  }

  if (body.action === "REJECT" || body.action === "SUSPEND") {
    const reason = (body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json(
        { error: body.action === "REJECT" ? "Motif de rejet requis." : "Motif de suspension requis." },
        { status: 400 },
      );
    }
    if (reason.length > 1000) {
      return NextResponse.json(
        { error: "Motif trop long (max 1000 caractères)." },
        { status: 400 },
      );
    }
  }

  const existing = await prisma.professionalProfile.findUnique({
    where: { id: body.profileId },
    select: {
      id: true,
      userId: true,
      status: true,
      verificationStatus: true,
      isVerified: true,
      verifiedAt: true,
      verifiedById: true,
      rejectionReason: true,

      profession: true,
      primaryProfessionId: true,
      secondaryProfessionIdsJson: true,
      badgesJson: true,
      licenseNumber: true,
      licenseAuthority: true,
      proofUrl: true,
      idProofUrl: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  if (existing.verificationStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Ce profil n’est pas en attente de validation." },
      { status: 409 },
    );
  }

  const now = new Date();

  if (body.action === "VERIFY") {
    if (!existing.proofUrl) {
      return NextResponse.json(
        { error: "Justificatif de compétence requis avant validation." },
        { status: 400 },
      );
    }

    // Pièce d’identité requise pour tous.
    if (!existing.idProofUrl) {
      return NextResponse.json(
        { error: "Pièce d’identité requise avant validation." },
        { status: 400 },
      );
    }

    const primaryProfessionId =
      (existing.primaryProfessionId && isProfessionId(existing.primaryProfessionId)
        ? existing.primaryProfessionId
        : null) ?? primaryProfessionIdFromLegacy(existing.profession as LegacyMarketplaceProfession);

    const secondary = jsonStringArray(existing.secondaryProfessionIdsJson).filter((id) => isProfessionId(id));
    const selected = [primaryProfessionId, ...secondary];
    const hasRegulated = selected.some((id) => isRegulatedProfession(id));

    if (hasRegulated) {
      if (!existing.licenseNumber || !existing.licenseAuthority || !existing.proofUrl) {
        return NextResponse.json(
          {
            error:
              "Métier réglementé: licence + autorité + justificatif sont requis avant validation.",
          },
          { status: 400 },
        );
      }
    }

    const currentBadges = normalizeBadges(existing.badgesJson);
    const nextBadges: BadgeType[] = currentBadges.filter(
      (b) => b !== "REGULATED_PROFESSION" && b !== "VERIFIED",
    ) as BadgeType[];

    nextBadges.push("VERIFIED");
    if (hasRegulated) nextBadges.push("REGULATED_PROFESSION");

    const [updatedUser, updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: { isCertified: true },
        select: { id: true, isCertified: true },
      }),
      prisma.professionalProfile.update({
        where: { id: existing.id },
        data: {
          verificationStatus: "VERIFIED",
          isVerified: true,
          verifiedAt: now,
          verifiedById: auth.viewer.id,
          rejectionReason: null,
          badgesJson: nextBadges,
        },
        select: {
          id: true,
          userId: true,
          verificationStatus: true,
          isVerified: true,
          verifiedAt: true,
          verifiedById: true,
          rejectionReason: true,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: "VERIFY_PRO",
        objectType: "ProfessionalProfile",
        objectId: updated.id,
        beforeJson: { ...existing, user: { id: existing.userId } },
        afterJson: { ...updated, user: updatedUser },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "SUSPEND") {
    const reason = (body.reason ?? "").trim();

    const existingUser = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: {
        id: true,
        accountStatus: true,
        suspendedAt: true,
        sessionInvalidBefore: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // On suspend le compte + le profil, et on invalide la session.
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: existingUser.id },
        data: {
          accountStatus: "SUSPENDED",
          suspendedAt: now,
          sessionInvalidBefore: now,
        },
        select: {
          id: true,
          accountStatus: true,
          suspendedAt: true,
          sessionInvalidBefore: true,
        },
      }),
      prisma.professionalProfile.update({
        where: { id: existing.id },
        data: {
          status: "SUSPENDED",
          verificationStatus: "SUSPENDED",
          isVerified: false,
          verifiedAt: now,
          verifiedById: auth.viewer.id,
          rejectionReason: reason,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          verificationStatus: true,
          isVerified: true,
          verifiedAt: true,
          verifiedById: true,
          rejectionReason: true,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: "SUSPEND_USER",
        objectType: "ProfessionalProfile",
        objectId: updatedProfile.id,
        beforeJson: {
          profile: existing,
          user: existingUser,
          reason,
        },
        afterJson: {
          profile: updatedProfile,
          user: updatedUser,
        },
      },
    });

    return NextResponse.json({ ok: true });
  }

  const reason = (body.reason ?? "").trim();
  const updated = await prisma.professionalProfile.update({
    where: { id: existing.id },
    data: {
      verificationStatus: "REJECTED",
      isVerified: false,
      verifiedAt: now,
      verifiedById: auth.viewer.id,
      rejectionReason: reason,
    },
    select: {
      id: true,
      userId: true,
      verificationStatus: true,
      isVerified: true,
      verifiedAt: true,
      verifiedById: true,
      rejectionReason: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: auth.viewer.id,
      action: "REJECT_PRO",
      objectType: "ProfessionalProfile",
      objectId: updated.id,
      beforeJson: existing,
      afterJson: updated,
    },
  });

  return NextResponse.json({ ok: true });
}

