import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getViewer() {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const events = await prisma.event.findMany({
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    include: {
      speakers: {
        include: { speaker: { select: { id: true, fullName: true, title: true, avatarUrl: true } } },
      },
      _count: { select: { likes: true, registrations: true } },
      likes: { where: { userId: viewer.id }, select: { userId: true } },
      registrations: { where: { userId: viewer.id }, select: { userId: true } },
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
    likedByViewer: e.likes.length > 0,
    registeredByViewer: e.registrations.length > 0,
    speakers: e.speakers.map((s) => s.speaker),
  }));

  return NextResponse.json({ events: payload });
}
