import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProVerificationAction = "VERIFY" | "REJECT" | "SUSPEND";

type ProVerificationBody = {
  action: ProVerificationAction;
  profileId: string;
  reason?: string;
};

export async function GET() {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const items = await prisma.marketplaceProfile.findMany({
    where: { verificationStatus: "PENDING" },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      userId: true,
      profession: true,
      organization: true,
      headline: true,
      country: true,
      city: true,
      licenseNumber: true,
      licenseAuthority: true,
      proofUrl: true,
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
      id: p.id,
      userId: p.userId,
      fullName: p.user.fullName,
      email: p.user.email,
      avatarUrl: p.user.avatarUrl,
      profession: p.profession,
      organization: p.organization,
      headline: p.headline,
      country: p.country,
      city: p.city,
      licenseNumber: p.licenseNumber,
      licenseAuthority: p.licenseAuthority,
      proofUrl: p.proofUrl,
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

  const existing = await prisma.marketplaceProfile.findUnique({
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
    const updated = await prisma.marketplaceProfile.update({
      where: { id: existing.id },
      data: {
        verificationStatus: "VERIFIED",
        isVerified: true,
        verifiedAt: now,
        verifiedById: auth.viewer.id,
        rejectionReason: null,
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
        action: "VERIFY_PRO",
        objectType: "MarketplaceProfile",
        objectId: updated.id,
        beforeJson: existing,
        afterJson: updated,
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
      prisma.marketplaceProfile.update({
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
        objectType: "MarketplaceProfile",
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
  const updated = await prisma.marketplaceProfile.update({
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
      objectType: "MarketplaceProfile",
      objectId: updated.id,
      beforeJson: existing,
      afterJson: updated,
    },
  });

  return NextResponse.json({ ok: true });
}

