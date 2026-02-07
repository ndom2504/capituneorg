import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction, MarketplaceProfileStatus, VerificationStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileListItem = {
  id: string;
  status: string;
  verificationStatus: string;
  profession: string;
  headline: string | null;
  organization: string | null;
  country: string;
  city: string;
  format: string;
  responseTime: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  proofUrl: string | null;
  licenseNumber: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
    isCertified: boolean;
  };
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const verificationStatus = (req.nextUrl.searchParams.get("verificationStatus") ?? "").trim();
  const profession = (req.nextUrl.searchParams.get("profession") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const items = await prisma.marketplaceProfile.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(verificationStatus ? { verificationStatus: verificationStatus as any } : {}),
      ...(profession ? { profession: profession as any } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { userId: { contains: q, mode: "insensitive" } },
              { headline: { contains: q, mode: "insensitive" } },
              { organization: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
              { user: { fullName: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          accountType: true,
          accountStatus: true,
          isCertified: true,
        },
      },
    },
  });

  const payload: ProfileListItem[] = items.map((p) => ({
    id: p.id,
    status: String(p.status),
    verificationStatus: String(p.verificationStatus),
    profession: String(p.profession),
    headline: p.headline,
    organization: p.organization,
    country: p.country,
    city: p.city,
    format: String(p.format),
    responseTime: p.responseTime ? String(p.responseTime) : null,
    isVerified: p.isVerified,
    verifiedAt: toIso(p.verifiedAt),
    proofUrl: p.proofUrl,
    licenseNumber: p.licenseNumber,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    user: {
      id: p.user.id,
      fullName: p.user.fullName,
      email: p.user.email,
      accountType: String(p.user.accountType),
      accountStatus: String(p.user.accountStatus),
      isCertified: p.user.isCertified,
    },
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}

type ActionBody =
  | { action: "SUSPEND"; profileId: string; reason?: string }
  | { action: "REACTIVATE"; profileId: string };

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const profileId = (body as any)?.profileId;
  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json({ error: "profileId requis." }, { status: 400 });
  }

  const action = (body as any)?.action;
  if (action !== "SUSPEND" && action !== "REACTIVATE") {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.marketplaceProfile.findUnique({
      where: { id: profileId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    if (!before) return { ok: false as const, error: "Profil introuvable." };

    if (action === "SUSPEND") {
      if (before.status === MarketplaceProfileStatus.SUSPENDED) {
        return { ok: false as const, error: "Profil déjà suspendu." };
      }

      const after = await tx.marketplaceProfile.update({
        where: { id: profileId },
        data: {
          status: MarketplaceProfileStatus.SUSPENDED,
          verificationStatus: VerificationStatus.SUSPENDED,
          rejectionReason: (body as any)?.reason ? String((body as any).reason).slice(0, 500) : before.rejectionReason,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.SUSPEND_PROFILE,
          objectType: "MarketplaceProfile",
          objectId: profileId,
          beforeJson: {
            id: before.id,
            userId: before.userId,
            status: String(before.status),
            verificationStatus: String(before.verificationStatus),
            verifiedAt: before.verifiedAt ? before.verifiedAt.toISOString() : null,
            rejectionReason: before.rejectionReason,
          },
          afterJson: {
            id: after.id,
            userId: after.userId,
            status: String(after.status),
            verificationStatus: String(after.verificationStatus),
            verifiedAt: after.verifiedAt ? after.verifiedAt.toISOString() : null,
            rejectionReason: after.rejectionReason,
          },
        },
      });

      return { ok: true as const };
    }

    // REACTIVATE
    if (before.status !== MarketplaceProfileStatus.SUSPENDED) {
      return { ok: false as const, error: "Seuls les profils suspendus peuvent être réactivés." };
    }

    const shouldRestoreVerified = Boolean(before.verifiedAt) || before.isVerified === true;
    const nextStatus = MarketplaceProfileStatus.PUBLISHED;
    const nextVerification = shouldRestoreVerified ? VerificationStatus.VERIFIED : VerificationStatus.DRAFT;

    const after = await tx.marketplaceProfile.update({
      where: { id: profileId },
      data: {
        status: nextStatus,
        verificationStatus: nextVerification,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: AuditAction.REACTIVATE_PROFILE,
        objectType: "MarketplaceProfile",
        objectId: profileId,
        beforeJson: {
          id: before.id,
          userId: before.userId,
          status: String(before.status),
          verificationStatus: String(before.verificationStatus),
          verifiedAt: before.verifiedAt ? before.verifiedAt.toISOString() : null,
        },
        afterJson: {
          id: after.id,
          userId: after.userId,
          status: String(after.status),
          verificationStatus: String(after.verificationStatus),
          verifiedAt: after.verifiedAt ? after.verifiedAt.toISOString() : null,
        },
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
