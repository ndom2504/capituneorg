import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "NEEDS_INFO":
      return "Infos requises";
    case "ACCEPTED":
      return "Acceptée";
    case "REJECTED":
      return "Refusée";
    default:
      return status;
  }
}

function topicLabel(topic: string | null) {
  switch (topic) {
    case "ETUDES":
      return "Études";
    case "TRAVAIL":
      return "Travail";
    case "ENTREPRENEUR":
      return "Entrepreneur";
    case "DOCUMENTS":
      return "Documents";
    case "BUDGET":
      return "Budget";
    case "INSTALLATION":
      return "Installation";
    case "ORIENTATION":
      return "Orientation";
    case "IMMIGRATION":
      return "Immigration";
    case "FAMILLE":
      return "Famille";
    case "INTEGRATION":
      return "Intégration";
    case "FORMATION":
      return "Formation";
    case "AUTRE":
      return "Autre";
    default:
      return "—";
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
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

  const request = await prisma.marketplaceRequest.findFirst({
    where: { id: requestId, requesterId: viewer.id },
    include: {
      professional: { select: { id: true, fullName: true, avatarUrl: true } },
      meeting: { select: { id: true, startsAt: true, durationMin: true, locationUrl: true } },
      paymentOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          service: { select: { id: true, title: true, description: true, priceCents: true, currency: true } },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true, stripeCheckoutSessionId: true, stripePaymentIntentId: true, paidAt: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        select: { id: true, senderRole: true, kind: true, body: true, fileUrl: true, fileName: true, createdAt: true },
      },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: request.id,
      status: request.status,
      statusLabel: statusLabel(request.status),
      topic: request.topic,
      topicLabel: topicLabel(request.topic),
      urgency: request.urgency,
      preferredTimeframe: request.preferredTimeframe,
      createdAt: request.createdAt.toISOString(),
      lastActivityAt: request.lastActivityAt.toISOString(),
      professional: {
        id: request.professional.id,
        fullName: request.professional.fullName,
        avatarUrl: request.professional.avatarUrl,
      },
      meeting: request.meeting
        ? {
            id: request.meeting.id,
            startsAt: request.meeting.startsAt.toISOString(),
            durationMin: request.meeting.durationMin,
            locationUrl: request.meeting.locationUrl,
          }
        : null,
      payment:
        request.paymentOrders.length > 0
          ? {
              orderId: request.paymentOrders[0].id,
              status: request.paymentOrders[0].status,
              amountCents: request.paymentOrders[0].amountCents,
              currency: request.paymentOrders[0].currency,
              service: {
                id: request.paymentOrders[0].service.id,
                title: request.paymentOrders[0].service.title,
                description: request.paymentOrders[0].service.description,
              },
              lastPayment: request.paymentOrders[0].payments[0]
                ? {
                    status: request.paymentOrders[0].payments[0].status,
                    paidAt: request.paymentOrders[0].payments[0].paidAt
                      ? request.paymentOrders[0].payments[0].paidAt.toISOString()
                      : null,
                  }
                : null,
            }
          : null,
      messages: request.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        kind: m.kind,
        body: m.body,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
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

  const updated = await prisma.marketplaceRequest.updateMany({
    where: { id: requestId, requesterId: viewer.id },
    data: { requesterLastReadAt: new Date() },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
