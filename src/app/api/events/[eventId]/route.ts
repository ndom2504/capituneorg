import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/events/[eventId]
 * Delete event (creator only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdBy: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.createdBy !== viewer.id && viewer.accountType !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  return NextResponse.json({ success: true });
}
