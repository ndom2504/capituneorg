import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getViewer() {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const { eventId } = await context.params;

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const existing = await prisma.eventLike.findUnique({
    where: { eventId_userId: { eventId, userId: viewer.id } },
  });

  if (existing) {
    await prisma.eventLike.delete({
      where: { eventId_userId: { eventId, userId: viewer.id } },
    });
  } else {
    await prisma.eventLike.create({ data: { userId: viewer.id, eventId } });
  }

  const likesCount = await prisma.eventLike.count({ where: { eventId } });
  const likedByViewer = !existing;

  return NextResponse.json({ likedByViewer, likesCount });
}
