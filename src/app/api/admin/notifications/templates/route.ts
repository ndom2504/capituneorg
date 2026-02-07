import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction, NotificationPriority, NotificationRole } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TemplateItem = {
  id: string;
  role: "DEMANDEUR" | "PRO";
  priority: "CRITICAL" | "IMPORTANT" | "INFO";
  type: string;
  title: string;
  message: string;
  link: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string;
  updatedByAdminId: string | null;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const role = (req.nextUrl.searchParams.get("role") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  try {
    const items = await prisma.notificationTemplate.findMany({
      where: {
        ...(role ? { role: role as any } : {}),
        ...(status === "ACTIVE" ? { archivedAt: null } : {}),
        ...(status === "ARCHIVED" ? { archivedAt: { not: null } } : {}),
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { type: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { message: { contains: q, mode: "insensitive" } },
                { link: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    const payload: TemplateItem[] = items.map((t) => ({
      id: t.id,
      role: t.role,
      priority: t.priority,
      type: t.type,
      title: t.title,
      message: t.message,
      link: t.link,
      archivedAt: toIso(t.archivedAt),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      createdByAdminId: t.createdByAdminId,
      updatedByAdminId: t.updatedByAdminId ?? null,
    }));

    return NextResponse.json({
      canAct: auth.viewer.adminRole === "ADMIN",
      items: payload,
      unavailable: false,
    });
  } catch {
    return NextResponse.json({
      canAct: auth.viewer.adminRole === "ADMIN",
      items: [] as TemplateItem[],
      unavailable: true,
    });
  }
}

type CreateBody = {
  role: "DEMANDEUR" | "PRO";
  priority?: "CRITICAL" | "IMPORTANT" | "INFO";
  type: string;
  title: string;
  message: string;
  link: string;
};

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const role = body?.role;
  const type = (body?.type ?? "").trim();
  const title = (body?.title ?? "").trim();
  const message = (body?.message ?? "").trim();
  const link = (body?.link ?? "").trim();
  const priority = (body?.priority ?? "INFO").trim();

  if (role !== "DEMANDEUR" && role !== "PRO") {
    return NextResponse.json({ error: "role invalide." }, { status: 400 });
  }

  if (!type) return NextResponse.json({ error: "type requis." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title requis." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "message requis." }, { status: 400 });
  if (!link) return NextResponse.json({ error: "link requis." }, { status: 400 });

  const prio = priority === "CRITICAL" ? NotificationPriority.CRITICAL : priority === "IMPORTANT" ? NotificationPriority.IMPORTANT : NotificationPriority.INFO;

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.notificationTemplate.create({
      data: {
        role: role === "DEMANDEUR" ? NotificationRole.DEMANDEUR : NotificationRole.PRO,
        priority: prio,
        type,
        title,
        message,
        link,
        createdByAdminId: auth.viewer.id,
        updatedByAdminId: null,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: AuditAction.CREATE_NOTIFICATION_TEMPLATE,
        objectType: "NotificationTemplate",
        objectId: created.id,
        afterJson: {
          id: created.id,
          role: String(created.role),
          priority: String(created.priority),
          type: created.type,
          title: created.title,
          message: created.message,
          link: created.link,
          archivedAt: created.archivedAt ? created.archivedAt.toISOString() : null,
        },
      },
    });

    return { ok: true as const, id: created.id };
  });

  return NextResponse.json({ ok: true, id: result.id });
}