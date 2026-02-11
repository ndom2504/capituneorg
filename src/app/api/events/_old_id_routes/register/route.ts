import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/register
 * Register user for event
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });

  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Already registered" }, { status: 400 });
  }

  // Create registration
  const registration = await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      userId: viewer.id,
      status: "REGISTERED",
    },
  });

  return NextResponse.json({ registration }, { status: 201 });
}
