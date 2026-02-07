import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getSessionUser();
  
  const events = await prisma.event.findMany({
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

export async function POST(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Seuls les professionnels certifiés peuvent créer des événements
  if (viewer.accountType !== "PROFESSIONAL" || !viewer.isCertified) {
    return NextResponse.json({ error: "Réservé aux professionnels certifiés" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    objectives?: string;
    audience?: string;
    prerequisites?: string;
    durationMin?: number;
    type?: string;
    theme?: string;
    level?: string;
    format?: string;
    startsAt?: string;
    liveUrl?: string;
    replayUrl?: string;
  } | null;

  if (!body || !body.title || !body.description || !body.type || !body.theme || !body.level || !body.format) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description,
      objectives: body.objectives || null,
      audience: body.audience || null,
      prerequisites: body.prerequisites || null,
      durationMin: body.durationMin || null,
      type: body.type as "LIVE" | "WEBINAIRE" | "ATELIER" | "FORMATION",
      theme: body.theme as "ETUDES" | "TRAVAIL" | "ENTREPRENEUR" | "DOCUMENTS" | "BUDGET",
      level: body.level as "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE",
      format: body.format as "LIVE" | "REPLAY",
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      liveUrl: body.liveUrl || null,
      replayUrl: body.replayUrl || null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
