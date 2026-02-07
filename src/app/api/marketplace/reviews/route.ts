import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/reviews
 * Permet au demandeur de noter un professionnel après avoir marqué la demande comme traitée
 */
export async function POST(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        marketplaceRequestId?: unknown;
        rating?: unknown;
        comment?: unknown;
      }
    | null;

  const marketplaceRequestId = String(body?.marketplaceRequestId ?? "");
  const rating = Number(body?.rating ?? 0);
  const comment = body?.comment
    ? String(body.comment).substring(0, 250).trim() || undefined
    : undefined;

  if (!marketplaceRequestId) {
    return NextResponse.json(
      { error: "marketplaceRequestId manquant" },
      { status: 400 },
    );
  }

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "rating doit être entre 1 et 5" },
      { status: 400 },
    );
  }

  // Vérifier que la demande existe et appartient au viewer
  const request = await prisma.marketplaceRequest.findUnique({
    where: { id: marketplaceRequestId },
    select: {
      id: true,
      requesterId: true,
      professionalId: true,
      status: true,
      closedByClientAt: true,
      acceptedAt: true,
    },
  });

  if (!request) {
    return NextResponse.json(
      { error: "Demande introuvable" },
      { status: 404 },
    );
  }

  if (request.requesterId !== viewer.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Anti-triche: on ne peut noter que si la demande a été acceptée et traitée
  if (!request.acceptedAt) {
    return NextResponse.json(
      { error: "Vous ne pouvez noter que les demandes acceptées" },
      { status: 400 },
    );
  }

  if (!request.closedByClientAt) {
    return NextResponse.json(
      {
        error:
          "Vous devez d'abord marquer la demande comme traitée avant de pouvoir noter",
      },
      { status: 400 },
    );
  }

  // Vérifier s'il existe déjà une review (upsert comportement)
  const existing = await prisma.review.findUnique({
    where: {
      authorId_marketplaceRequestId: {
        authorId: viewer.id,
        marketplaceRequestId: request.id,
      },
    },
    select: { id: true },
  });

  let review;

  if (existing) {
    // Mise à jour (modifiable 1 fois max déjà géré par la contrainte unique)
    review = await prisma.review.update({
      where: { id: existing.id },
      data: {
        rating,
        comment,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } else {
    // Création
    review = await prisma.review.create({
      data: {
        professionalId: request.professionalId,
        authorId: viewer.id,
        marketplaceRequestId: request.id,
        rating,
        comment,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  return NextResponse.json({ success: true, review });
}
