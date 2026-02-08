import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { requireStripe } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  orderId: string;
};

export async function POST(req: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Réservé aux demandeurs." },
      { status: 403 },
    );
  }

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "orderId requis." }, { status: 400 });
  }

  const order = await prisma.paymentOrder.findFirst({
    where: { id: body.orderId, buyerUserId: viewer.id },
    include: {
      service: { select: { title: true, description: true } },
      marketplaceRequest: { select: { id: true } },
      connectedAccount: { select: { id: true, stripeAccountId: true, payoutsEnabled: true, detailsSubmitted: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "Cette commande n’est pas en attente de paiement." },
      { status: 409 },
    );
  }

  let stripe;
  try {
    stripe = requireStripe();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe non configuré";
    return NextResponse.json({ error: message }, { status: 501 });
  }
  const origin = new URL(req.url).origin;

  const requestId = order.marketplaceRequest?.id;
  const successUrl = requestId
    ? `${origin}/marketplace/mes-demandes/${requestId}?payment=success&session_id={CHECKOUT_SESSION_ID}`
    : `${origin}/mon-dossier?tab=paiements&payment=success&session_id={CHECKOUT_SESSION_ID}`;

  const cancelUrl = requestId
    ? `${origin}/marketplace/mes-demandes/${requestId}?payment=cancel`
    : `${origin}/mon-dossier?tab=paiements&payment=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: viewer.email,
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: order.currency,
          unit_amount: order.amountCents,
          product_data: {
            name: order.service.title,
            description: order.service.description ?? undefined,
          },
        },
      },
    ],
    metadata: {
      orderId: order.id,
      marketplaceRequestId: requestId ?? "",
      buyerUserId: order.buyerUserId,
      providerUserId: order.providerUserId,
    },
    payment_intent_data:
      order.connectedAccount?.payoutsEnabled === true && order.connectedAccount?.detailsSubmitted === true
        ? {
            application_fee_amount: order.applicationFeeCents ?? undefined,
            transfer_data: {
              destination: order.connectedAccount.stripeAccountId,
            },
            metadata: {
              orderId: order.id,
              marketplaceRequestId: requestId ?? "",
              buyerUserId: order.buyerUserId,
              providerUserId: order.providerUserId,
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

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe n’a pas renvoyé d’URL de paiement." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
