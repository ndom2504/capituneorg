import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getViewer() {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  return prisma.user.findUnique({ where: { email }, select: { id: true, accountType: true } });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const { eventId } = await context.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, startsAt: true, replayUrl: true, liveUrl: true, type: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  // MVP règle: on s'inscrit aux lives à venir; pour les replays on ne force pas l'inscription.
  if (!event.startsAt && event.replayUrl) {
    return NextResponse.json(
      { error: "Inscription non requise pour un replay." },
      { status: 400 },
    );
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: viewer.id } },
  });

  if (existing) {
    await prisma.eventRegistration.delete({
      where: { eventId_userId: { eventId, userId: viewer.id } },
    });
  } else {
    await prisma.eventRegistration.create({ data: { userId: viewer.id, eventId } });

    // V1 notifications: inscription confirmée (silencieux si la table n'existe pas encore)
    const role = viewer.accountType === "USER" ? "DEMANDEUR" : "PRO";
    const soon = event.startsAt ? event.startsAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 : false;
    const priority = soon ? "IMPORTANT" : "INFO";
    try {
      await prisma.notification.create({
        data: {
          userId: viewer.id,
          role,
          type: "EVENT_REGISTERED",
          title: "Inscription confirmée",
          message: "Votre inscription est enregistrée. Cliquez pour voir les détails.",
          link: `/evenements-formations/${eventId}`,
          priority,
        },
      });
    } catch {
      // ignore
    }
  }

  const registrationsCount = await prisma.eventRegistration.count({ where: { eventId } });
  const registeredByViewer = !existing;

  return NextResponse.json({ registeredByViewer, registrationsCount });
}
