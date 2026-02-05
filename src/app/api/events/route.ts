import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getSessionUser();
  
  const events = await db.event.findMany({
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    include: {
      speakers: {
        include: { speaker: { select: { id: true, fullName: true, title: true, avatarUrl: true } } },
      },
      _count: { select: { likes: true, registrations: true } },
      ...(viewer ? {
        likes: { where: { userId: viewer.id }, select: { userId: true } },
        registrations: { where: { userId: viewer.id }, select: { userId: true } },
      } : {}),
    },
  });

  const payload = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    objectives: e.objectives,
    audience: e.audience,
    prerequisites: e.prerequisites,
    durationMin: e.durationMin,
    type: e.type,
    theme: e.theme,
    level: e.level,
    format: e.format,
    startsAt: e.startsAt ? e.startsAt.toISOString() : null,
    liveUrl: e.liveUrl,
    replayUrl: e.replayUrl,
    isFeatured: e.isFeatured,
    createdAt: e.createdAt.toISOString(),
    likesCount: e._count.likes,
    registrationsCount: e._count.registrations,
    likedByViewer: viewer && 'likes' in e ? e.likes.length > 0 : false,
    registeredByViewer: viewer && 'registrations' in e ? e.registrations.length > 0 : false,
    speakers: e.speakers.map((s) => s.speaker),
  }));

  return NextResponse.json({ events: payload });
}
