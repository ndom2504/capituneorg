import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Milestone = "ANALYSE" | "DOSSIER" | "SOUMISSION";

type Payload =
  | { action: "CREATE" }
  | { action: "UPDATE_DRAFT"; contractTitle?: string; contractBody?: string }
  | { action: "SEND_CONTRACT" }
  | { action: "REQUEST_PAYMENT" }
  | { action: "MARK_PAID" }
  | { action: "ADVANCE_MILESTONE"; milestone: Milestone }
  | { action: "COMPLETE" }
  | { action: "CANCEL" };

type EngagementRow = {
  id: string;
  status: string;
  contractTitle: string;
  contractBody: string;
  contractSentAt: Date | null;
  signedAt: Date | null;
  signedByUserId: string | null;
  signedByName: string | null;
  paymentRequestedAt: Date | null;
  paidAt: Date | null;
  milestone: Milestone;
  analyseDoneAt: Date | null;
  dossierDoneAt: Date | null;
  soumissionDoneAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PaymentOrderRow = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  paidAt: Date | null;
  createdAt: Date;
  service: { id: string; title: string };
};

type RequestRow = {
  id: string;
  status: string;
  requesterId: string;
  professionalId: string;
  engagement: EngagementRow | null;
  paymentOrders: PaymentOrderRow[];
};

// NOTE: In this clone repo, the editor sometimes keeps stale Prisma types and
// reports false-positive errors for newly-added relations/delegates.
// We intentionally go through `any` here to keep runtime behavior correct.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as unknown as any;

function mustBePayload(value: unknown): Payload | null {
  if (!value || typeof value !== "object") return null;
  const action = (value as { action?: unknown }).action;
  if (typeof action !== "string") return null;
  return value as Payload;
}

function clampText(value: unknown, max: number) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v.length > max ? v.slice(0, max) : v;
}

function mustBeMilestone(value: unknown): Milestone | null {
  if (value === "ANALYSE" || value === "DOSSIER" || value === "SOUMISSION") return value;
  return null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;
  const viewerId = auth.viewer.id;
  const isAdmin = auth.viewer.accountType === "ADMIN";

  const request = (await db.marketplaceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      requesterId: true,
      professionalId: true,
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
  } as never)) as unknown as RequestRow | null;

  if (!request) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  if (!isAdmin && request.professionalId !== viewerId) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  return NextResponse.json({
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;
  const viewerId = auth.viewer.id;
  const isAdmin = auth.viewer.accountType === "ADMIN";

  const bodyUnknown = (await req.json().catch(() => null)) as unknown;
  const body = mustBePayload(bodyUnknown);
  if (!body) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const request = (await db.marketplaceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      requesterId: true,
      professionalId: true,
      engagement: {
        select: {
          id: true,
          status: true,
          contractTitle: true,
          contractBody: true,
          contractSentAt: true,
          signedAt: true,
          paymentRequestedAt: true,
          paidAt: true,
          milestone: true,
          analyseDoneAt: true,
          dossierDoneAt: true,
          soumissionDoneAt: true,
          completedAt: true,
          canceledAt: true,
        },
      },
    },
  } as never)) as unknown as (Omit<RequestRow, "paymentOrders"> & { engagement: EngagementRow | null }) | null;

  if (!request) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  if (!isAdmin && request.professionalId !== viewerId) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  const now = new Date();

  if (body.action === "CREATE") {
    if (request.engagement) {
      return NextResponse.json({ engagement: request.engagement });
    }

    if (request.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "La prestation ne peut être créée que lorsque la demande est acceptée." },
        { status: 400 },
      );
    }

    const engagement = (await db.marketplaceEngagement.create({
      data: {
        requestId: request.id,
        requesterId: request.requesterId,
        professionalId: request.professionalId,
        status: "DRAFT",
        contractTitle: "Contrat de prestation",
        contractBody: "",
        milestone: "ANALYSE",
      },
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
    } as never)) as unknown as EngagementRow;

    await db.marketplaceRequestMessage
      .create({
        data: {
          requestId: request.id,
          senderRole: "SYSTEM",
          kind: "STATUS_UPDATE",
          body: "Prestation créée: brouillon de contrat en préparation.",
          createdAt: now,
        },
        select: { id: true },
      })
      .catch(() => null);

    return NextResponse.json({ engagement });
  }

  const existing = request.engagement;
  if (!existing) {
    return NextResponse.json({ error: "Aucune prestation. Créez-la d’abord." }, { status: 404 });
  }

  if (body.action === "UPDATE_DRAFT") {
    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Le contrat n’est modifiable qu’en brouillon." }, { status: 400 });
    }

    const maybe = body as { contractTitle?: unknown; contractBody?: unknown };
    const contractTitle = clampText(maybe.contractTitle ?? existing.contractTitle, 140) || existing.contractTitle;
    const contractBody = clampText(maybe.contractBody ?? existing.contractBody, 50_000);

    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: { contractTitle, contractBody },
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
    } as never)) as unknown as EngagementRow;

    return NextResponse.json({ engagement });
  }

  if (body.action === "SEND_CONTRACT") {
    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Le contrat a déjà été envoyé ou signé." }, { status: 400 });
    }

    const bodyTrimmed = (existing.contractBody ?? "").trim();
    if (!bodyTrimmed) {
      return NextResponse.json({ error: "Le contrat est vide." }, { status: 400 });
    }

    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: { status: "CONTRACT_SENT", contractSentAt: now },
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
    } as never)) as unknown as EngagementRow;

    await db.marketplaceRequestMessage
      .create({
        data: {
          requestId: request.id,
          senderRole: "SYSTEM",
          kind: "STATUS_UPDATE",
          body: "Contrat soumis au demandeur (signature requise).",
          createdAt: now,
        },
        select: { id: true },
      })
      .catch(() => null);

    // Notification demandeur (best-effort)
    await db.notification
      .create({
        data: {
          userId: request.requesterId,
          role: "DEMANDEUR",
          type: "MARKETPLACE_CONTRACT_SENT",
          title: "Contrat à signer",
          message: "Le professionnel a soumis un contrat. Ouvrez la demande pour le consulter et signer.",
          link: `/marketplace/mes-demandes/${request.id}`,
          priority: "IMPORTANT",
        },
      })
      .catch(() => null);

    return NextResponse.json({ engagement });
  }

  if (body.action === "REQUEST_PAYMENT") {
    if (
      existing.status !== "SIGNED" &&
      existing.status !== "IN_PROGRESS" &&
      existing.status !== "PAID" &&
      existing.status !== "PAYMENT_REQUESTED"
    ) {
      return NextResponse.json({ error: "Le paiement peut être demandé après signature." }, { status: 400 });
    }

    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: {
        status: existing.status === "PAID" ? "PAID" : "PAYMENT_REQUESTED",
        paymentRequestedAt: existing.paymentRequestedAt ?? now,
      },
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
    } as never)) as unknown as EngagementRow;

    await db.marketplaceRequestMessage
      .create({
        data: {
          requestId: request.id,
          senderRole: "SYSTEM",
          kind: "STATUS_UPDATE",
          body: "Paiement requis: le professionnel a demandé le paiement.",
          createdAt: now,
        },
        select: { id: true },
      })
      .catch(() => null);

    await db.notification
      .create({
        data: {
          userId: request.requesterId,
          role: "DEMANDEUR",
          type: "MARKETPLACE_PAYMENT_REQUESTED",
          title: "Paiement requis",
          message: "Le professionnel a demandé le paiement. Ouvrez la demande pour procéder.",
          link: `/marketplace/mes-demandes/${request.id}`,
          priority: "IMPORTANT",
        },
      })
      .catch(() => null);

    return NextResponse.json({ engagement });
  }

  if (body.action === "MARK_PAID") {
    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: { status: "PAID", paidAt: now },
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
    } as never)) as unknown as EngagementRow;

    return NextResponse.json({ engagement });
  }

  if (body.action === "ADVANCE_MILESTONE") {
    if (
      existing.status !== "SIGNED" &&
      existing.status !== "PAYMENT_REQUESTED" &&
      existing.status !== "PAID" &&
      existing.status !== "IN_PROGRESS"
    ) {
      return NextResponse.json({ error: "Les jalons sont disponibles après signature." }, { status: 400 });
    }

    const milestone = mustBeMilestone((body as { milestone?: unknown }).milestone);
    if (!milestone) return NextResponse.json({ error: "milestone invalide." }, { status: 400 });

    const update: {
      milestone: Milestone;
      analyseDoneAt?: Date;
      dossierDoneAt?: Date;
      soumissionDoneAt?: Date;
      status?: string;
    } = { milestone };
    if (milestone === "ANALYSE") update.analyseDoneAt = existing.analyseDoneAt ?? now;
    if (milestone === "DOSSIER") update.dossierDoneAt = existing.dossierDoneAt ?? now;
    if (milestone === "SOUMISSION") update.soumissionDoneAt = existing.soumissionDoneAt ?? now;

    // Passage implicite en IN_PROGRESS dès qu'on suit des jalons
    if (existing.status === "SIGNED" || existing.status === "PAYMENT_REQUESTED" || existing.status === "PAID") {
      update.status = "IN_PROGRESS";
    }

    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: update,
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
    } as never)) as unknown as EngagementRow;

    await db.marketplaceRequestMessage
      .create({
        data: {
          requestId: request.id,
          senderRole: "SYSTEM",
          kind: "STATUS_UPDATE",
          body: `Avancement jalon: ${milestone}.`,
          createdAt: now,
        },
        select: { id: true },
      })
      .catch(() => null);

    return NextResponse.json({ engagement });
  }

  if (body.action === "COMPLETE") {
    if (existing.status !== "IN_PROGRESS" && existing.status !== "PAID" && existing.status !== "SIGNED") {
      return NextResponse.json({ error: "La prestation n’est pas en cours." }, { status: 400 });
    }
    if (!existing.soumissionDoneAt) {
      return NextResponse.json({ error: "La soumission doit être complétée avant de terminer." }, { status: 400 });
    }

    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: { status: "COMPLETED", completedAt: now },
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
    } as never)) as unknown as EngagementRow;

    await db.marketplaceRequestMessage
      .create({
        data: {
          requestId: request.id,
          senderRole: "SYSTEM",
          kind: "STATUS_UPDATE",
          body: "Prestation terminée.",
          createdAt: now,
        },
        select: { id: true },
      })
      .catch(() => null);

    return NextResponse.json({ engagement });
  }

  if (body.action === "CANCEL") {
    const engagement = (await db.marketplaceEngagement.update({
      where: { id: existing.id },
      data: { status: "CANCELED", canceledAt: now },
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
    } as never)) as unknown as EngagementRow;

    return NextResponse.json({ engagement });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
