import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const viewer = await getAppViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
  }

  // Check if already registered
  const existing = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: {
        eventId: event.id,
        userId: viewer.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ message: "Déjà inscrit" }, { status: 200 });
  }

  // Create registration
  await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      userId: viewer.id,
      status: "REGISTERED",
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
