import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventListItem = {
  id: string;
  title: string;
  type: string;
  theme: string;
  level: string;
  format: string;
  startsAt: string | null;
  liveUrl: string | null;
  replayUrl: string | null;
  isFeatured: boolean;
  status: string;
  createdAt: string;
  speakers: { id: string; fullName: string; title: string | null; avatarUrl: string | null }[];

  likesCount: number;
  registrationsCount: number;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const featured = (req.nextUrl.searchParams.get("featured") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const whereFeatured = featured === "1" ? { isFeatured: true } : {};

  const items = await prisma.event.findMany({
    where: {
      ...whereFeatured,
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      speakers: {
        include: { speaker: { select: { id: true, fullName: true, title: true, avatarUrl: true } } },
      },
      _count: { select: { likes: true, registrations: true } },
    },
  });

  const payload: EventListItem[] = items.map((e) => ({
    id: e.id,
    title: e.title,
    type: String(e.type),
    theme: String(e.theme),
    level: String(e.level),
    format: String(e.format),
    startsAt: toIso(e.startsAt),
    liveUrl: e.liveUrl,
    replayUrl: e.replayUrl,
    isFeatured: e.isFeatured,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    speakers: e.speakers.map((s) => s.speaker),
    likesCount: e._count.likes,
    registrationsCount: e._count.registrations,
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}

type ActionBody =
  | { action: "FEATURE"; eventId: string }
  | { action: "UNFEATURE"; eventId: string }
  | { action: "SUSPEND"; eventId: string }
  | { action: "REACTIVATE"; eventId: string }
  | { action: "DELETE"; eventId: string };

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
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

  const eventId = (body as any)?.eventId;
  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "eventId requis." }, { status: 400 });
  }

  const action = (body as any)?.action;
  if (!["FEATURE", "UNFEATURE", "SUSPEND", "REACTIVATE", "DELETE"].includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Handling DELETE separately because it destroys the record
    if (action === "DELETE") {
      const before = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, createdBy: true },
      });
      if (!before) return { ok: false as const, error: "Événement introuvable." };

      await tx.event.delete({ where: { id: eventId } });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.DELETE_EVENT,
          objectType: "Event",
          objectId: eventId,
          beforeJson: before,
          afterJson: { deleted: true },
        },
      });
      return { ok: true as const };
    }

    // Other actions (Update)
    const before = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true, isFeatured: true, title: true, status: true },
    });
    if (!before) return { ok: false as const, error: "Événement introuvable." };

    let dataToUpdate: any = {};
    let auditAction: AuditAction;

    if (action === "FEATURE") {
      dataToUpdate = { isFeatured: true };
      auditAction = AuditAction.FEATURE_EVENT;
    } else if (action === "UNFEATURE") {
      dataToUpdate = { isFeatured: false };
      auditAction = AuditAction.UNFEATURE_EVENT;
    } else if (action === "SUSPEND") {
      dataToUpdate = { status: "SUSPENDED" };
      auditAction = AuditAction.SUSPEND_EVENT;
    } else if (action === "REACTIVATE") {
      // Restore to PUBLISHED if it was SUSPENDED, or just force PUBLISHED?
      // For now, let's set to PUBLISHED to allow immediate restore of visibility.
      // Alternatively, we could default to DRAFT.
      dataToUpdate = { status: "PUBLISHED" };
      auditAction = AuditAction.REACTIVATE_EVENT;
    } else {
      return { ok: false as const, error: "Action non gérée." };
    }
  
    const after = await tx.event.update({
      where: { id: eventId },
      data: dataToUpdate,
      select: { id: true, isFeatured: true, title: true, status: true },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: auditAction
      data: {
        adminId: auth.viewer.id,
        action: makeFeatured ? AuditAction.FEATURE_EVENT : AuditAction.UNFEATURE_EVENT,
        objectType: "Event",
        objectId: eventId,
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
