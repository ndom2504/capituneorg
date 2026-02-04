import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateOrderBody = {
  marketplaceRequestId: string;
  serviceId: string;
};

export async function POST(req: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux professionnels." }, { status: 403 });
  }

  let body: CreateOrderBody;
  try {
    body = (await req.json()) as CreateOrderBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!body.marketplaceRequestId || !body.serviceId) {
    return NextResponse.json(
      { error: "marketplaceRequestId et serviceId sont requis." },
      { status: 400 },
    );
  }

  const request = await prisma.marketplaceRequest.findFirst({
    where: { id: body.marketplaceRequestId, professionalId: viewer.id },
    select: { id: true, requesterId: true, professionalId: true, status: true },
  });

  if (!request) {
    return NextResponse.json(
      { error: "Demande introuvable ou non assignée à ce professionnel." },
      { status: 404 },
    );
  }

  const service = await prisma.paymentService.findFirst({
    where: {
      id: body.serviceId,
      active: true,
      OR: [{ providerUserId: null }, { providerUserId: viewer.id }],
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      currency: true,
      durationMinutes: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
  }

  const order = await prisma.paymentOrder.create({
    data: {
      marketplaceRequestId: request.id,
      buyerUserId: request.requesterId,
      providerUserId: request.professionalId,
      serviceId: service.id,
      status: "PENDING_PAYMENT",
      amountCents: service.priceCents,
      currency: service.currency,
    },
    select: { id: true },
  });

  await prisma.marketplaceRequestMessage.create({
    data: {
      requestId: request.id,
      senderRole: "SYSTEM",
      kind: "STATUS_UPDATE",
      body: `Paiement requis : ${service.title} — ${(service.priceCents / 100).toFixed(2)} ${service.currency.toUpperCase()}.`,
    },
  });

  await prisma.marketplaceRequest.update({
    where: { id: request.id },
    data: { lastActivityAt: new Date() },
    select: { id: true },
  });

  return NextResponse.json({ orderId: order.id });
}
