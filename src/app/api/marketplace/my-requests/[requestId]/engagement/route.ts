import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOTE: The clone repo can keep stale Prisma types in the editor.
// We go through `any` to avoid false-positive relation/delegate errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as unknown as any;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Espace réservé aux demandeurs." },
      { status: 403 },
    );
  }

  const { requestId } = await context.params;

  const request = await db.marketplaceRequest.findFirst({
    where: { id: requestId, requesterId: viewer.id },
    select: {
      id: true,
      status: true,
      engagement: {
        select: {
          id: true,
          status: true,
          contractTitle: true,
          contractBody: true,
          contractSentAt: true,
          signedAt: true,
          signedByUserId: true,
          signedByName: true,
          paymentRequestedAt: true,
          paidAt: true,
          milestone: true,
          analyseDoneAt: true,
          dossierDoneAt: true,
          soumissionDoneAt: true,
          completedAt: true,
          canceledAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      paymentOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          amountCents: true,
          currency: true,
          paidAt: true,
          createdAt: true,
          service: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    request: { id: request.id, status: request.status },
    engagement: request.engagement,
    payment:
      request.paymentOrders.length > 0
        ? {
            orderId: request.paymentOrders[0].id,
            status: request.paymentOrders[0].status,
            amountCents: request.paymentOrders[0].amountCents,
            currency: request.paymentOrders[0].currency,
            paidAt: request.paymentOrders[0].paidAt ? request.paymentOrders[0].paidAt.toISOString() : null,
            service: request.paymentOrders[0].service,
            createdAt: request.paymentOrders[0].createdAt.toISOString(),
          }
        : null,
  });
}
