import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notificationRoleForAccountType(accountType: string) {
  return accountType === "USER" ? "DEMANDEUR" : "PRO";
}

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

    // Notification au demandeur
    try {
      await prisma.notification.create({
        data: {
          userId: existing.requester.id,
          role: notificationRoleForAccountType("USER"),
          type: "MARKETPLACE_REQUEST_UPDATED",
          title: "Demande refusée",
          message: "Votre demande de rendez-vous a été refusée. Consultez la réponse du professionnel.",
          link: `/marketplace/mes-demandes/${requestId}`,
          priority: "INFO",
        },
      });
    } catch (e) {
      console.warn("[demandes] notification create failed", { requestId, error: e });
    }

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

    // Notification au demandeur
    try {
      await prisma.notification.create({
        data: {
          userId: existing.requester.id,
          role: notificationRoleForAccountType("USER"),
          type: "MARKETPLACE_REQUEST_UPDATED",
          title: "Informations demandées",
          message: "Le professionnel a besoin d'informations supplémentaires. Consultez son message.",
          link: `/marketplace/mes-demandes/${requestId}`,
          priority: "IMPORTANT",
        },
      });
    } catch (e) {
      console.warn("[demandes] notification create failed", { requestId, error: e });
    }

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

  // Génération automatique d'un lien Teams si aucun lien fourni
  let locationUrl = clampText(body.locationUrl, 500);
  if (!locationUrl) {
    // Format: https://teams.microsoft.com/l/meetup-join/19%3ameeting_RANDOMID
    // Pour simplifier, on génère un lien générique avec l'ID du meeting comme référence
    // En production, intégrer Graph API pour créer un vrai meeting Teams
    const meetingRef = Buffer.from(`${existing.id}-${Date.now()}`).toString("base64url");
    locationUrl = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${meetingRef}`;
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
      locationUrl,
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

  // Notification au demandeur
  try {
    await prisma.notification.create({
      data: {
        userId: existing.requester.id,
        role: notificationRoleForAccountType("USER"),
        type: "MARKETPLACE_REQUEST_ACCEPTED",
        title: "Rendez-vous accepté",
        message: `Votre demande a été acceptée ! Rendez-vous le ${meeting.startsAt.toLocaleDateString("fr-CA")} à ${meeting.startsAt.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}.`,
        link: `/marketplace/mes-demandes/${requestId}`,
        priority: "IMPORTANT",
      },
    });
  } catch (e) {
    console.warn("[demandes] notification create failed", { requestId, error: e });
  }

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
  const viewerId = auth.viewer.id;
  const viewerType = auth.viewer.accountType;
  const isAdmin = viewerType === "ADMIN";

  async function resolveMarketplaceRequestId(id: string) {
    const trimmed = (id ?? "").trim();
    if (!trimmed) return null;

    // 1) ID = message id (MarketplaceRequestMessage.id)
    const byMessage = await prisma.marketplaceRequestMessage
      .findUnique({ where: { id: trimmed }, select: { requestId: true } })
      .catch(() => null);
    if (byMessage?.requestId) return { resolvedId: byMessage.requestId, resolvedFrom: "message" as const };

    // 2) ID = meeting id (Meeting.id)
    const byMeeting = await prisma.marketplaceRequest
      .findFirst({ where: { meetingId: trimmed }, select: { id: true } })
      .catch(() => null);
    if (byMeeting?.id) return { resolvedId: byMeeting.id, resolvedFrom: "meeting" as const };

    // 3) ID = profile id (MarketplaceProfile.id) -> récupérer la dernière demande pour ce profil
    const byProfile = await prisma.marketplaceRequest
      .findFirst({
        where: {
          profileId: trimmed,
          ...(isAdmin ? {} : { professionalId: viewerId }),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      .catch(() => null);
    if (byProfile?.id) return { resolvedId: byProfile.id, resolvedFrom: "profile" as const };

    return null;
  }

  let resolvedFrom: null | "message" | "meeting" | "profile" = null;
  let canonicalRequestId = requestId;

  let r = await prisma.marketplaceRequest.findUnique({
    where: { id: canonicalRequestId },
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
    const resolved = await resolveMarketplaceRequestId(requestId);
    if (resolved?.resolvedId && resolved.resolvedId !== canonicalRequestId) {
      canonicalRequestId = resolved.resolvedId;
      resolvedFrom = resolved.resolvedFrom;
      r = await prisma.marketplaceRequest.findUnique({
        where: { id: canonicalRequestId },
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
    }
  }

  if (!r) {
    console.warn("[demandes] request not found", {
      requestId,
      resolvedFrom,
      resolvedTo: canonicalRequestId !== requestId ? canonicalRequestId : null,
      viewerId,
      viewerType,
    });
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (!isAdmin && r.professionalId !== auth.viewer.id) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  return NextResponse.json({
    canonicalRequestId: r.id,
    resolvedFromId: canonicalRequestId !== requestId ? requestId : null,
    resolvedFrom,
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
