import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction, ProfessionalProfileStatus, Prisma, ReportStatus, ReportTargetType, VerificationStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportListItem = {
  id: string;
  targetType: string;
  targetId: string | null;
  status: string;
  reason: string | null;
  reporter: { id: string; fullName: string; email: string } | null;
  resolvedBy: { id: string; fullName: string; email: string } | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const targetType = (req.nextUrl.searchParams.get("targetType") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const allowedStatus = new Set<ReportStatus>(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]);
  const allowedTargetTypes = new Set<ReportTargetType>([
    "POST",
    "COMMENT",
    "PROFILE",
    "OFFER",
    "PRO",
    "DOSSIER",
    "OTHER",
  ]);

  const parsedStatus = allowedStatus.has(status as ReportStatus) ? (status as ReportStatus) : undefined;
  const parsedTargetType = allowedTargetTypes.has(targetType as ReportTargetType)
    ? (targetType as ReportTargetType)
    : undefined;

  const whereStatus = parsedStatus
    ? { status: parsedStatus }
    : { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } };
  const whereTargetType = parsedTargetType ? { targetType: parsedTargetType } : {};

  const items = await prisma.report.findMany({
    where: {
      ...whereStatus,
      ...whereTargetType,
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { targetId: { contains: q, mode: "insensitive" } },
              { reason: { contains: q, mode: "insensitive" } },
              { reporter: { fullName: { contains: q, mode: "insensitive" } } },
              { reporter: { email: { contains: q, mode: "insensitive" } } },
              { resolutionNote: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      status: true,
      reason: true,
      resolutionNote: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      reporter: { select: { id: true, fullName: true, email: true } },
      resolvedBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  const payload: ReportListItem[] = items.map((it) => ({
    id: it.id,
    targetType: String(it.targetType),
    targetId: it.targetId,
    status: String(it.status),
    reason: it.reason,
    reporter: it.reporter,
    resolvedBy: it.resolvedBy,
    resolvedAt: toIso(it.resolvedAt),
    resolutionNote: it.resolutionNote,
    createdAt: it.createdAt.toISOString(),
    updatedAt: it.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}

type ActionBody =
  | { action: "MARK_IN_REVIEW"; reportId: string }
  | { action: "RESOLVE"; reportId: string; note?: string }
  | { action: "DISMISS"; reportId: string; note?: string }
  | {
      action: "SANCTION";
      reportId: string;
      sanction: "HIDE_POST" | "DELETE_COMMENT" | "SUSPEND_PROFILE";
      note?: string;
    };

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
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

  const reportId = body.reportId;
  if (!reportId) {
    return NextResponse.json({ error: "reportId requis." }, { status: 400 });
  }

  const action = body.action;
  const note = "note" in body && typeof body.note === "string" ? body.note.trim() : "";
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        resolutionNote: true,
        resolvedAt: true,
        resolvedById: true,
        targetType: true,
        targetId: true,
      },
    });

    if (!before) {
      return { ok: false as const, error: "Signalement introuvable." };
    }

    if (action === "SANCTION") {
      if (before.status !== ReportStatus.OPEN && before.status !== ReportStatus.IN_REVIEW) {
        return {
          ok: false as const,
          error: "Seuls les reports OPEN/IN_REVIEW peuvent recevoir une sanction.",
        };
      }

      const targetId = before.targetId;
      if (!targetId) {
        return { ok: false as const, error: "targetId manquant sur le report." };
      }

      const sanction = body.sanction;

      if (sanction === "HIDE_POST") {
        if (before.targetType !== ReportTargetType.POST) {
          return { ok: false as const, error: "Sanction HIDE_POST incompatible avec targetType." };
        }

        const postBefore = await tx.userPost.findUnique({
          where: { id: targetId },
          select: { id: true, isHidden: true, commentsLocked: true, pinnedAt: true },
        });
        if (!postBefore) return { ok: false as const, error: "Post introuvable." };

        const postAfter = await tx.userPost.update({
          where: { id: targetId },
          data: { isHidden: true },
          select: { id: true, isHidden: true, commentsLocked: true, pinnedAt: true },
        });

        await tx.auditLog.create({
          data: {
            adminId: auth.viewer.id,
            action: AuditAction.HIDE_POST,
            objectType: "UserPost",
            objectId: targetId,
            beforeJson: postBefore,
            afterJson: postAfter,
          },
        });
      } else if (sanction === "DELETE_COMMENT") {
        if (before.targetType !== ReportTargetType.COMMENT) {
          return { ok: false as const, error: "Sanction DELETE_COMMENT incompatible avec targetType." };
        }

        const commentBefore = await tx.userPostComment.findUnique({
          where: { id: targetId },
          select: { id: true, postId: true, userId: true, message: true, createdAt: true },
        });
        if (!commentBefore) return { ok: false as const, error: "Commentaire introuvable." };

        await tx.userPostComment.delete({ where: { id: targetId } });

        await tx.auditLog.create({
          data: {
            adminId: auth.viewer.id,
            action: AuditAction.DELETE_COMMENT,
            objectType: "UserPostComment",
            objectId: targetId,
            beforeJson: commentBefore,
            afterJson: Prisma.JsonNull,
          },
        });
      } else {
        // SUSPEND_PROFILE
        if (before.targetType !== ReportTargetType.PRO && before.targetType !== ReportTargetType.PROFILE) {
          return { ok: false as const, error: "Sanction SUSPEND_PROFILE incompatible avec targetType." };
        }

        const profileBefore = await tx.professionalProfile.findUnique({
          where: { id: targetId },
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
        if (!profileBefore) return { ok: false as const, error: "Profil professionnel introuvable." };

        const profileAfter = await tx.professionalProfile.update({
          where: { id: targetId },
          data: {
            status: ProfessionalProfileStatus.SUSPENDED,
            verificationStatus: VerificationStatus.SUSPENDED,
            isVerified: false,
            verifiedAt: now,
            verifiedById: auth.viewer.id,
            rejectionReason: note || "Suspendu via signalement.",
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
        });

        await tx.auditLog.create({
          data: {
            adminId: auth.viewer.id,
            action: AuditAction.SUSPEND_PROFILE,
            objectType: "ProfessionalProfile",
            objectId: targetId,
            beforeJson: profileBefore,
            afterJson: profileAfter,
          },
        });
      }

      const resolutionNote = note || `Sanction appliquée: ${body.sanction}`;

      const reportAfter = await tx.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.RESOLVED,
          resolvedById: auth.viewer.id,
          resolvedAt: now,
          resolutionNote,
        },
        select: { id: true, status: true, resolvedById: true, resolvedAt: true, resolutionNote: true },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.REPORT_RESOLVE,
          objectType: "Report",
          objectId: reportId,
          beforeJson: before,
          afterJson: reportAfter,
        },
      });

      return { ok: true as const };
    }

    if (action === "MARK_IN_REVIEW") {
      if (String(before.status) !== "OPEN") {
        return { ok: false as const, error: "Seuls les reports OPEN peuvent passer en IN_REVIEW." };
      }

      const after = await tx.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.IN_REVIEW },
        select: { id: true, status: true, updatedAt: true },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.REPORT_REVIEW,
          objectType: "Report",
          objectId: reportId,
          beforeJson: before,
          afterJson: after,
        },
      });

      return { ok: true as const };
    }

    if (action === "RESOLVE") {
      if (String(before.status) === "DISMISSED") {
        return { ok: false as const, error: "Un report DISMISSED ne peut pas être résolu." };
      }

      const after = await tx.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.RESOLVED,
          resolvedById: auth.viewer.id,
          resolvedAt: now,
          resolutionNote: note || null,
        },
        select: { id: true, status: true, resolvedById: true, resolvedAt: true, resolutionNote: true },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.REPORT_RESOLVE,
          objectType: "Report",
          objectId: reportId,
          beforeJson: before,
          afterJson: after,
        },
      });

      return { ok: true as const };
    }

    // DISMISS
    if (String(before.status) === "RESOLVED") {
      return { ok: false as const, error: "Un report RESOLVED ne peut pas être rejeté." };
    }

    const after = await tx.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.DISMISSED,
        resolvedById: auth.viewer.id,
        resolvedAt: now,
        resolutionNote: note || null,
      },
      select: { id: true, status: true, resolvedById: true, resolvedAt: true, resolutionNote: true },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: AuditAction.REPORT_DISMISS,
        objectType: "Report",
        objectId: reportId,
        beforeJson: before,
        afterJson: after,
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
