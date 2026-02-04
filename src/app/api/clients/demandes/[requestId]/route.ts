import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function topicLabel(value: string | null) {
  switch (value) {
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

type UpdateRequestPayload = {
  action?: "ACCEPT" | "REJECT" | "NEEDS_INFO";
  proNote?: string | null;
  startsAt?: string; // ISO (required for ACCEPT)
  durationMin?: number;
  locationUrl?: string | null;
};

function clampText(value: string | undefined | null, max: number) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;

  const body = (await req.json().catch(() => null)) as UpdateRequestPayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const isAdmin = auth.viewer.accountType === "ADMIN";

  const existing = await prisma.marketplaceRequest.findUnique({
    where: { id: requestId },
    include: { requester: { select: { id: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (!isAdmin && existing.professionalId !== auth.viewer.id) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "action requise." }, { status: 400 });
  }

  const now = new Date();
  const proNote = clampText(body.proNote, 800);

  async function addSystemStatusMessage(status: "ACCEPTED" | "REJECTED" | "NEEDS_INFO") {
    await prisma.marketplaceRequestMessage.create({
      data: {
        requestId,
        senderRole: "SYSTEM",
        kind: "STATUS_UPDATE",
        body:
          status === "ACCEPTED"
            ? "Statut mis à jour: Acceptée."
            : status === "REJECTED"
              ? "Statut mis à jour: Refusée."
              : "Statut mis à jour: Infos requises.",
        createdAt: now,
      },
      select: { id: true },
    });

    if (proNote) {
      await prisma.marketplaceRequestMessage.create({
        data: {
          requestId,
          senderRole: "PROFESSIONAL",
          kind: "TEXT",
          body: proNote,
          createdAt: now,
        },
        select: { id: true },
      });
    }

    await prisma.marketplaceRequest.update({
      where: { id: requestId },
      data: { lastActivityAt: now },
      select: { id: true },
    });
  }

  if (action === "REJECT") {
    const updated = await prisma.marketplaceRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        proNote,
        lastActivityAt: now,
      },
      select: { id: true, status: true, updatedAt: true },
    });

    await addSystemStatusMessage("REJECTED");

    return NextResponse.json({
      ok: true,
      request: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() },
    });
  }

  if (action === "NEEDS_INFO") {
    const updated = await prisma.marketplaceRequest.update({
      where: { id: requestId },
      data: {
        status: "NEEDS_INFO",
        proNote,
        lastActivityAt: now,
      },
      select: { id: true, status: true, updatedAt: true },
    });

    await addSystemStatusMessage("NEEDS_INFO");

    return NextResponse.json({
      ok: true,
      request: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() },
    });
  }

  // ACCEPT
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "startsAt requis (ISO) pour ACCEPT." }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      clientId: existing.requester.id,
      proId: auth.viewer.id,
      title: "Meeting Marketplace",
      type: "ORIENTATION",
      status: "SCHEDULED",
      startsAt,
      durationMin: Math.max(15, Math.min(180, Math.trunc(body.durationMin ?? 45))),
      locationUrl: clampText(body.locationUrl, 500),
      notesInternal: clampText(body.proNote, 2000),
    },
    select: { id: true, startsAt: true, durationMin: true, locationUrl: true },
  });

  const updated = await prisma.marketplaceRequest.update({
    where: { id: requestId },
    data: {
      status: "ACCEPTED",
      proNote,
      meetingId: meeting.id,
      lastActivityAt: now,
    },
    select: { id: true, status: true, updatedAt: true },
  });

  await addSystemStatusMessage("ACCEPTED");

  await prisma.marketplaceRequestMessage.create({
    data: {
      requestId,
      senderRole: "SYSTEM",
      kind: "MEETING",
      body: `Rendez-vous planifié: ${meeting.startsAt.toISOString()}`,
      createdAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    request: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() },
    meeting: {
      id: meeting.id,
      startsAt: meeting.startsAt.toISOString(),
      durationMin: meeting.durationMin,
      locationUrl: meeting.locationUrl,
    },
  });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;
  const isAdmin = auth.viewer.accountType === "ADMIN";

  const r = await prisma.marketplaceRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { id: true, fullName: true, avatarUrl: true } },
      professional: { select: { id: true, fullName: true } },
      meeting: { select: { id: true, startsAt: true, durationMin: true, locationUrl: true } },
      paymentOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          service: { select: { title: true, currency: true, priceCents: true } },
        },
      },
      messages: {
        where: { kind: "FILE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fileUrl: true, fileName: true, createdAt: true },
      },
    },
  });

  if (!r) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (!isAdmin && r.professionalId !== auth.viewer.id) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  return NextResponse.json({
    item: {
      id: r.id,
      status: r.status,
      topic: r.topic,
      topicLabel: topicLabel(r.topic),
      urgency: r.urgency,
      preferredTimeframe: r.preferredTimeframe,
      message: r.message,
      proNote: r.proNote,
      createdAt: r.createdAt.toISOString(),
      payment:
        r.paymentOrders.length > 0
          ? {
              orderId: r.paymentOrders[0].id,
              status: r.paymentOrders[0].status,
              amountCents: r.paymentOrders[0].amountCents,
              currency: r.paymentOrders[0].currency,
              serviceTitle: r.paymentOrders[0].service.title,
            }
          : null,
      cv: r.messages[0]?.fileUrl
        ? {
            url: r.messages[0].fileUrl,
            name: r.messages[0].fileName ?? "Document",
            createdAt: r.messages[0].createdAt.toISOString(),
          }
        : null,
      requester: {
        id: r.requester.id,
        fullName: r.requester.fullName,
        avatarUrl: r.requester.avatarUrl,
      },
      meeting: r.meeting
        ? {
            id: r.meeting.id,
            startsAt: r.meeting.startsAt.toISOString(),
            durationMin: r.meeting.durationMin,
            locationUrl: r.meeting.locationUrl,
          }
        : null,
    },
  });
}
