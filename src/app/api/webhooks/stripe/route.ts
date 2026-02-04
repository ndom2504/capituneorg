import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/db";
import { requireStripe, requireStripeWebhookSecret } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function markPaid(args: {
  checkoutSessionId: string;
  paymentIntentId: string | null;
}) {
  const { checkoutSessionId, paymentIntentId } = args;

  const payment = await prisma.payment.findFirst({
    where: { stripeCheckoutSessionId: checkoutSessionId },
    include: {
      order: {
        include: {
          marketplaceRequest: { select: { id: true } },
          service: { select: { title: true } },
        },
      },
    },
  });

  if (!payment) return;

  const now = new Date();

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCEEDED",
      stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
      paidAt: now,
    },
  });

  await prisma.paymentOrder.update({
    where: { id: payment.orderId },
    data: {
      status: "PAID",
      paidAt: now,
    },
  });

  // Débloque le dossier (MVP): crée/active un Dossier “Marketplace” côté demandeur
  await prisma.dossier.upsert({
    where: {
      // pas d'unicité userId => fallback: créer un dossier id déterministe serait risqué;
      // on fait un upsert sur un id stable lié à l'ordre.
      id: `dossier-order-${payment.orderId}`,
    },
    update: { status: "EN_COURS" },
    create: {
      id: `dossier-order-${payment.orderId}`,
      userId: payment.order.buyerUserId,
      program: "Marketplace",
      status: "EN_COURS",
    },
  });

  const requestId = payment.order.marketplaceRequest?.id;
  if (requestId) {
    await prisma.marketplaceRequestMessage.create({
      data: {
        requestId,
        senderRole: "SYSTEM",
        kind: "STATUS_UPDATE",
        body: `Paiement confirmé. Service: ${payment.order.service.title}.`,
      },
    });

    await prisma.marketplaceRequest.update({
      where: { id: requestId },
      data: { lastActivityAt: now },
      select: { id: true },
    });
  }
}

export async function POST(req: NextRequest) {
  const stripe = requireStripe();
  const webhookSecret = requireStripeWebhookSecret();

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await markPaid({
        checkoutSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
    }

    // (optionnel) gérer aussi les paiements async
    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      await markPaid({
        checkoutSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur webhook";
    // Stripe retry si 5xx
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
