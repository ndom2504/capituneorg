import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/requests/[requestId]/close
 * Permet au demandeur de marquer sa demande comme traitée
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { requestId } = await context.params;

  const request = await prisma.marketplaceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requesterId: true,
      professionalId: true,
      status: true,
      closedByClientAt: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  // Seul le demandeur peut clôturer sa propre demande
  if (request.requesterId !== viewer.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Empêcher de clôturer plusieurs fois
  if (request.closedByClientAt) {
    return NextResponse.json(
      { error: "Demande déjà marquée comme traitée" },
      { status: 400 },
    );
  }

  // Mettre à jour la base de données
  const updated = await prisma.marketplaceRequest.update({
    where: { id: requestId },
    data: {
      closedByClientAt: new Date(),
    },
    select: {
      id: true,
      closedByClientAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    closedByClientAt: updated.closedByClientAt,
  });
}
