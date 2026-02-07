import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction, NotificationPriority, NotificationRole } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionBody =
  | {
      action: "UPDATE";
      role: "DEMANDEUR" | "PRO";
      priority: "CRITICAL" | "IMPORTANT" | "INFO";
      type: string;
      title: string;
      message: string;
      link: string;
    }
  | { action: "ARCHIVE" }
  | { action: "RESTORE" };

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ templateId: string }> }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const { templateId } = await ctx.params;
  if (!templateId) return NextResponse.json({ error: "templateId requis." }, { status: 400 });

  try {
    const t = await prisma.notificationTemplate.findUnique({ where: { id: templateId } });
    if (!t) return NextResponse.json({ error: "Template introuvable." }, { status: 404 });

    return NextResponse.json({
      canAct: auth.viewer.adminRole === "ADMIN",
      item: {
        id: t.id,
        role: String(t.role),
        priority: String(t.priority),
        type: t.type,
        title: t.title,
        message: t.message,
        link: t.link,
        archivedAt: toIso(t.archivedAt),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        createdByAdminId: t.createdByAdminId,
        updatedByAdminId: t.updatedByAdminId ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Notifications indisponibles (migration en attente)." }, { status: 503 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ templateId: string }> }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  const { templateId } = await ctx.params;
  if (!templateId) return NextResponse.json({ error: "templateId requis." }, { status: 400 });

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const action = (body as any)?.action;
  if (action !== "UPDATE" && action !== "ARCHIVE" && action !== "RESTORE") {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.notificationTemplate.findUnique({
        where: { id: templateId },
        select: {
          id: true,
          role: true,
          priority: true,
          type: true,
          title: true,
          message: true,
          link: true,
          archivedAt: true,
          createdByAdminId: true,
          updatedByAdminId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!before) return { ok: false as const, error: "Template introuvable." };

      if (action === "ARCHIVE") {
        if (before.archivedAt) return { ok: false as const, error: "Template déjà archivé." };

        const after = await tx.notificationTemplate.update({
          where: { id: templateId },
          data: { archivedAt: new Date(), updatedByAdminId: auth.viewer.id },
          select: { id: true, role: true, priority: true, type: true, title: true, message: true, link: true, archivedAt: true },
        });

        await tx.auditLog.create({
          data: {
            adminId: auth.viewer.id,
            action: AuditAction.ARCHIVE_NOTIFICATION_TEMPLATE,
            objectType: "NotificationTemplate",
            objectId: templateId,
            beforeJson: {
              ...before,
              role: String(before.role),
              priority: String(before.priority),
              archivedAt: toIso(before.archivedAt),
              createdAt: before.createdAt.toISOString(),
              updatedAt: before.updatedAt.toISOString(),
            },
            afterJson: {
              ...after,
              role: String(after.role),
              priority: String(after.priority),
              archivedAt: toIso(after.archivedAt),
            },
          },
        });

        return { ok: true as const };
      }

      if (action === "RESTORE") {
        if (!before.archivedAt) return { ok: false as const, error: "Template déjà actif." };

        const after = await tx.notificationTemplate.update({
          where: { id: templateId },
          data: { archivedAt: null, updatedByAdminId: auth.viewer.id },
          select: { id: true, role: true, priority: true, type: true, title: true, message: true, link: true, archivedAt: true },
        });

        await tx.auditLog.create({
          data: {
            adminId: auth.viewer.id,
            action: AuditAction.RESTORE_NOTIFICATION_TEMPLATE,
            objectType: "NotificationTemplate",
            objectId: templateId,
            beforeJson: {
              ...before,
              role: String(before.role),
              priority: String(before.priority),
              archivedAt: toIso(before.archivedAt),
              createdAt: before.createdAt.toISOString(),
              updatedAt: before.updatedAt.toISOString(),
            },
            afterJson: {
              ...after,
              role: String(after.role),
              priority: String(after.priority),
              archivedAt: toIso(after.archivedAt),
            },
          },
        });

        return { ok: true as const };
      }

      // UPDATE
      const role = (body as any)?.role;
      const priority = (body as any)?.priority;
      const type = String((body as any)?.type ?? "").trim();
      const title = String((body as any)?.title ?? "").trim();
      const message = String((body as any)?.message ?? "").trim();
      const link = String((body as any)?.link ?? "").trim();

      if (role !== "DEMANDEUR" && role !== "PRO") {
        return { ok: false as const, error: "role invalide." };
      }
      if (priority !== "CRITICAL" && priority !== "IMPORTANT" && priority !== "INFO") {
        return { ok: false as const, error: "priority invalide." };
      }
      if (!type) return { ok: false as const, error: "type requis." };
      if (!title) return { ok: false as const, error: "title requis." };
      if (!message) return { ok: false as const, error: "message requis." };
      if (!link) return { ok: false as const, error: "link requis." };

      const prio = priority === "CRITICAL" ? NotificationPriority.CRITICAL : priority === "IMPORTANT" ? NotificationPriority.IMPORTANT : NotificationPriority.INFO;

      const after = await tx.notificationTemplate.update({
        where: { id: templateId },
        data: {
          role: role === "DEMANDEUR" ? NotificationRole.DEMANDEUR : NotificationRole.PRO,
          priority: prio,
          type,
          title,
          message,
          link,
          updatedByAdminId: auth.viewer.id,
        },
        select: { id: true, role: true, priority: true, type: true, title: true, message: true, link: true, archivedAt: true },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.UPDATE_NOTIFICATION_TEMPLATE,
          objectType: "NotificationTemplate",
          objectId: templateId,
          beforeJson: {
            ...before,
            role: String(before.role),
            priority: String(before.priority),
            archivedAt: toIso(before.archivedAt),
            createdAt: before.createdAt.toISOString(),
            updatedAt: before.updatedAt.toISOString(),
          },
          afterJson: {
            ...after,
            role: String(after.role),
            priority: String(after.priority),
            archivedAt: toIso(after.archivedAt),
          },
        },
      });

      return { ok: true as const };
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notifications indisponibles (migration en attente)." }, { status: 503 });
  }
}