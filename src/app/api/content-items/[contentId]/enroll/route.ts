import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { requireStripe } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function computeApplicationFeeCents(amountCents: number) {
  const pct = Math.round(amountCents * 0.1);
  const min = 300;
  const raw = Math.max(pct, min);

  if (amountCents <= 1) return 0;
  return Math.min(raw, amountCents - 1);
}

function isContentPublished(args: {
  type: "EVENT" | "TRAINING";
  eventStatus: string | null;
  publishStatus: string;
}) {
  if (args.type === "EVENT") return args.eventStatus === "PUBLISHED";
  return args.publishStatus === "PUBLISHED";
}

function viewerRole(viewer: { accountType: "USER" | "PROFESSIONAL" | "ADMIN" }) {
  if (viewer.accountType === "USER") return "DEMANDEUR" as const;
  return "PRO" as const;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { contentId } = await params;
  if (!contentId) {
    return NextResponse.json({ error: "contentId requis." }, { status: 400 });
  }

  const content = await prisma.contentItem.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      type: true,
      ownerId: true,
      title: true,
      description: true,
      isPaid: true,
      priceCents: true,
      currency: true,
      targetRole: true,
      eventStatus: true,
      publishStatus: true,
      paymentService: { select: { id: true } },
      owner: { select: { id: true, fullName: true } },
    },
  });

  if (!content) {
    return NextResponse.json({ error: "Contenu introuvable." }, { status: 404 });
  }

  if (content.ownerId === viewer.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas vous inscrire à votre propre contenu." }, { status: 403 });
  }

  if (!isContentPublished({
    type: content.type,
    eventStatus: content.eventStatus ?? null,
    publishStatus: content.publishStatus,
  })) {
    return NextResponse.json({ error: "Contenu non publié." }, { status: 403 });
  }

  const role = viewerRole(viewer);
  if (content.targetRole && content.targetRole !== "ALL" && content.targetRole !== role) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  // FREE flow
  if (content.isPaid !== true) {
    const enrollment = await prisma.enrollment.upsert({
      where: { contentId_userId: { contentId: content.id, userId: viewer.id } },
      update: { paymentStatus: "FREE" },
      create: {
        contentId: content.id,
        userId: viewer.id,
        paymentStatus: "FREE",
      },
      select: { id: true, paymentStatus: true },
    });

    return NextResponse.json({ ok: true, enrollment, free: true });
  }

  const amountCents = content.priceCents ?? 0;
  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  if ((content.currency ?? "cad").toLowerCase() !== "cad") {
    return NextResponse.json({ error: "Devise non supportée (CAD uniquement)." }, { status: 400 });
  }

  // Ensure local PaymentService for this ContentItem (stable mapping)
  const service = await prisma.paymentService.upsert({
    where: { contentItemId: content.id },
    update: {
      providerUserId: content.ownerId,
      title: content.title,
      description: content.description,
      priceCents: amountCents,
      currency: "cad",
      active: true,
    },
    create: {
      contentItemId: content.id,
      providerUserId: content.ownerId,
      title: content.title,
      description: content.description,
      priceCents: amountCents,
      currency: "cad",
      active: true,
    },
    select: { id: true },
  });

  // Enrollment upsert
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { contentId_userId: { contentId: content.id, userId: viewer.id } },
    select: { id: true, paymentStatus: true, paymentOrderId: true },
  });

  if (existingEnrollment?.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const connect = await prisma.stripeConnectedAccount.findUnique({
    where: { userId: content.ownerId },
    select: { id: true, stripeAccountId: true, payoutsEnabled: true, detailsSubmitted: true },
  });
  const connectReady = connect?.payoutsEnabled === true && connect?.detailsSubmitted === true;
  const applicationFeeCents = connectReady ? computeApplicationFeeCents(amountCents) : null;

  const reusedOrderId = existingEnrollment?.paymentOrderId ?? null;
  const reusableOrder = reusedOrderId
    ? await prisma.paymentOrder.findUnique({
        where: { id: reusedOrderId },
        select: { id: true, status: true },
      })
    : null;

  const order =
    reusableOrder?.status === "PENDING_PAYMENT"
      ? await prisma.paymentOrder.update({
          where: { id: reusableOrder.id },
          data: {
            amountCents,
            currency: "cad",
            connectedAccountId: connectReady ? connect!.id : null,
            applicationFeeCents,
          },
          select: { id: true },
        })
      : await prisma.paymentOrder.create({
          data: {
            buyerUserId: viewer.id,
            providerUserId: content.ownerId,
            serviceId: service.id,
            status: "PENDING_PAYMENT",
            amountCents,
            currency: "cad",
            connectedAccountId: connectReady ? connect!.id : null,
            applicationFeeCents,
          },
          select: { id: true },
        });

  const enrollment = await prisma.enrollment.upsert({
    where: { contentId_userId: { contentId: content.id, userId: viewer.id } },
    update: {
      paymentStatus: "PENDING",
      paymentOrderId: order.id,
    },
    create: {
      contentId: content.id,
      userId: viewer.id,
      paymentStatus: "PENDING",
      paymentOrderId: order.id,
    },
    select: { id: true },
  });

  const stripe = requireStripe();
  const origin = new URL(req.url).origin;

  const successUrl = `${origin}/evenements-formations/contenu/${content.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/evenements-formations/contenu/${content.id}?payment=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: viewer.email,
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: amountCents,
          product_data: {
            name: content.title,
            description: content.description ?? undefined,
          },
        },
      },
    ],
    metadata: {
      orderId: order.id,
      contentId: content.id,
      enrollmentId: enrollment.id,
      buyerUserId: viewer.id,
      providerUserId: content.ownerId,
    },
    payment_intent_data:
      connectReady
        ? {
            application_fee_amount: applicationFeeCents ?? undefined,
            transfer_data: {
              destination: connect!.stripeAccountId,
            },
            metadata: {
              orderId: order.id,
              contentId: content.id,
              enrollmentId: enrollment.id,
              buyerUserId: viewer.id,
              providerUserId: content.ownerId,
            },
          }
        : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      stripeCheckoutSessionId: session.id,
      status: "CREATED",
    },
    select: { id: true },
  });

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { stripeSessionId: session.id },
    select: { id: true },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe n’a pas renvoyé d’URL." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url: session.url, orderId: order.id, enrollmentId: enrollment.id });
}
