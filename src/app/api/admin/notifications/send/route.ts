import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  userId: string;
  templateId: string;
  overrides?: {
    title?: string;
    message?: string;
    link?: string;
    priority?: "CRITICAL" | "IMPORTANT" | "INFO";
    type?: string;
  };
};

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const userId = String(body?.userId ?? "").trim();
  const templateId = String(body?.templateId ?? "").trim();
  if (!userId) return NextResponse.json({ error: "userId requis." }, { status: 400 });
  if (!templateId) return NextResponse.json({ error: "templateId requis." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [user, template] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true } }),
        tx.notificationTemplate.findUnique({
          where: { id: templateId },
          select: { id: true, archivedAt: true, role: true, priority: true, type: true, title: true, message: true, link: true },
        }),
      ]);

      if (!user) return { ok: false as const, error: "Utilisateur introuvable." };
      if (!template) return { ok: false as const, error: "Template introuvable." };
      if (template.archivedAt) return { ok: false as const, error: "Template archivé (envoi bloqué)." };

      const overrides = body.overrides ?? {};
      const title = (overrides.title ?? template.title).trim();
      const message = (overrides.message ?? template.message).trim();
      const link = (overrides.link ?? template.link).trim();
      const type = (overrides.type ?? template.type).trim();

      if (!title) return { ok: false as const, error: "title vide." };
      if (!message) return { ok: false as const, error: "message vide." };
      if (!link) return { ok: false as const, error: "link vide." };
      if (!type) return { ok: false as const, error: "type vide." };

      const priority = overrides.priority ?? String(template.priority);

      const created = await tx.notification.create({
        data: {
          userId: user.id,
          role: template.role,
          priority: (priority === "CRITICAL" || priority === "IMPORTANT" || priority === "INFO" ? (priority as any) : template.priority) as any,
          type,
          title,
          message,
          link,
        },
        select: {
          id: true,
          userId: true,
          role: true,
          priority: true,
          type: true,
          title: true,
          message: true,
          link: true,
          createdAt: true,
          readAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.SEND_NOTIFICATION,
          objectType: "Notification",
          objectId: created.id,
          beforeJson: {
            templateId,
            targetUserId: user.id,
            targetUserEmail: user.email,
          },
          afterJson: {
            id: created.id,
            userId: created.userId,
            role: String(created.role),
            priority: String(created.priority),
            type: created.type,
            title: created.title,
            message: created.message,
            link: created.link,
            createdAt: created.createdAt.toISOString(),
            readAt: created.readAt ? created.readAt.toISOString() : null,
          },
        },
      });

      return { ok: true as const, notificationId: created.id };
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, notificationId: result.notificationId });
  } catch {
    return NextResponse.json({ error: "Notifications indisponibles (migration en attente)." }, { status: 503 });
  }
}