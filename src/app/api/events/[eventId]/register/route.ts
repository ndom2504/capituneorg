import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = await params;
    const viewer = await getAppViewer();

    if (!viewer) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }

    // Toggle registration
    // 1. Check if exists
    const existing = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: viewer.id,
        },
      },
    });

    let registeredByViewer = false;

    if (existing) {
      // Un-register
      await prisma.eventRegistration.delete({
        where: { id: existing.id },
      });
      registeredByViewer = false;
    } else {
      // Register
      await prisma.eventRegistration.create({
        data: {
          eventId,
          userId: viewer.id,
          status: "CONFIRMED",
        },
      });
      registeredByViewer = true;
    }

    // Return new counts
    const registrationsCount = await prisma.eventRegistration.count({
      where: { eventId },
    });

    return NextResponse.json({
      registeredByViewer,
      registrationsCount,
    });
  } catch (error) {
    console.error("[event-register] Error:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
