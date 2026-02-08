import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireStripe, requireStripeWebhookSecret } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncEnrollmentByOrderId(args: {
  orderId: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
}) {
  await prisma.enrollment.updateMany({
    where: { paymentOrderId: args.orderId },
    data: { paymentStatus: args.paymentStatus },
  });
}

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

  // Évite les effets de bord (messages, etc.) si déjà traité via un autre event
  const alreadyPaid =
    payment.status === "SUCCEEDED" &&
    payment.paidAt &&
    payment.order.status === "PAID" &&
    payment.order.paidAt;

  if (alreadyPaid) {
    await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "PAID" });
    if (paymentIntentId && payment.stripePaymentIntentId !== paymentIntentId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: paymentIntentId },
      });
    }
    return;
  }

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

  await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "PAID" });

  const requestId = payment.order.marketplaceRequest?.id;
  if (requestId) {
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

async function markFailed(args: {
  checkoutSessionId?: string;
  paymentIntentId?: string;
  reason?: string;
}) {
  const { checkoutSessionId, paymentIntentId } = args;

  const payment = await prisma.payment.findFirst({
    where: {
      ...(checkoutSessionId ? { stripeCheckoutSessionId: checkoutSessionId } : {}),
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
    include: {
      order: {
        include: {
          marketplaceRequest: { select: { id: true } },
        },
      },
    },
  });

  if (!payment) return;

  const alreadyTerminal =
    payment.status === "FAILED" || payment.status === "REFUNDED" || payment.status === "SUCCEEDED";
  const orderAlreadyTerminal =
    payment.order.status === "FAILED" ||
    payment.order.status === "CANCELED" ||
    payment.order.status === "REFUNDED" ||
    payment.order.status === "PAID";

  if (alreadyTerminal || orderAlreadyTerminal) {
    if (payment.order.status === "PAID") {
      await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "PAID" });
    } else if (payment.order.status === "REFUNDED") {
      await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "REFUNDED" });
    } else if (payment.order.status === "FAILED" || payment.order.status === "CANCELED") {
      await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "FAILED" });
    }
    return;
  }

  const now = new Date();

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
    },
  });

  await prisma.paymentOrder.update({
    where: { id: payment.orderId },
    data: {
      status: "FAILED",
      canceledAt: now,
    },
  });

  await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "FAILED" });

  const requestId = payment.order.marketplaceRequest?.id;
  if (requestId) {
    await prisma.marketplaceRequestMessage.create({
      data: {
        requestId,
        senderRole: "SYSTEM",
        kind: "STATUS_UPDATE",
        body: `Paiement échoué.${args.reason ? ` (${args.reason})` : ""}`,
      },
    });

    await prisma.marketplaceRequest.update({
      where: { id: requestId },
      data: { lastActivityAt: now },
      select: { id: true },
    });
  }
}

async function markRefundedByPaymentIntent(args: {
  paymentIntentId: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: args.paymentIntentId },
    include: {
      order: {
        include: {
          marketplaceRequest: { select: { id: true } },
        },
      },
    },
  });

  if (!payment) return;
  if (payment.status === "REFUNDED" || payment.order.status === "REFUNDED") {
    await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "REFUNDED" });
    return;
  }

  const now = new Date();

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      refundedAt: now,
    },
  });

  await prisma.paymentOrder.update({
    where: { id: payment.orderId },
    data: {
      status: "REFUNDED",
      refundedAt: now,
    },
  });

  await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "REFUNDED" });

  const requestId = payment.order.marketplaceRequest?.id;
  if (requestId) {
    await prisma.marketplaceRequestMessage.create({
      data: {
        requestId,
        senderRole: "SYSTEM",
        kind: "STATUS_UPDATE",
        body: "Paiement remboursé.",
      },
    });

    await prisma.marketplaceRequest.update({
      where: { id: requestId },
      data: { lastActivityAt: now },
      select: { id: true },
    });
  }
}

async function markPaidByPaymentIntent(args: {
  paymentIntentId: string;
  orderIdFromMetadata?: string | null;
}) {
  const { paymentIntentId, orderIdFromMetadata } = args;

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { stripePaymentIntentId: paymentIntentId },
        ...(orderIdFromMetadata
          ? [
              {
                orderId: orderIdFromMetadata,
                status: {
                  in: [PaymentStatus.CREATED, PaymentStatus.FAILED],
                },
              },
            ]
          : []),
      ],
    },
    include: {
      order: {
        include: {
          marketplaceRequest: { select: { id: true } },
          service: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) return;

  const now = new Date();
  const alreadyPaid =
    payment.status === "SUCCEEDED" &&
    payment.paidAt &&
    payment.order.status === "PAID" &&
    payment.order.paidAt;

  if (!alreadyPaid) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        stripePaymentIntentId: paymentIntentId,
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

    await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "PAID" });
  } else if (payment.stripePaymentIntentId !== paymentIntentId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentIntentId: paymentIntentId },
    });

    await syncEnrollmentByOrderId({ orderId: payment.orderId, paymentStatus: "PAID" });
  }

  // Débloque dossier + message uniquement si on vient de passer en PAID
  if (!alreadyPaid) {
    const requestId = payment.order.marketplaceRequest?.id;
    if (requestId) {
      await prisma.dossier.upsert({
        where: { id: `dossier-order-${payment.orderId}` },
        update: { status: "EN_COURS" },
        create: {
          id: `dossier-order-${payment.orderId}`,
          userId: payment.order.buyerUserId,
          program: "Marketplace",
          status: "EN_COURS",
        },
      });

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
}

async function recordStripeEventOnce(event: Stripe.Event) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        // Payload volontairement minimal pour rester 100% sérialisable.
        payloadJson: {
          created: event.created,
          livemode: event.livemode,
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return { shouldProcess: true } as const;
  } catch (e) {
    // Doublon => déjà traité
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { shouldProcess: false } as const;
    }
    throw e;
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
    const { shouldProcess } = await recordStripeEventOnce(event);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

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

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await markFailed({
        checkoutSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      });
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await markPaidByPaymentIntent({
        paymentIntentId: pi.id,
        orderIdFromMetadata: (pi.metadata?.orderId as string | undefined) ?? null,
      });
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const message =
        (pi.last_payment_error?.message as string | undefined) ??
        (pi.last_payment_error?.code as string | undefined);
      await markFailed({
        paymentIntentId: pi.id,
        reason: message,
      });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (paymentIntentId) {
        await markRefundedByPaymentIntent({ paymentIntentId });
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await prisma.stripeConnectedAccount.updateMany({
        where: { stripeAccountId: account.id },
        data: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirementsDueJson: account.requirements
            ? ({
                currently_due: account.requirements.currently_due,
                eventually_due: account.requirements.eventually_due,
                past_due: account.requirements.past_due,
                pending_verification: account.requirements.pending_verification,
                disabled_reason: account.requirements.disabled_reason,
              } satisfies Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur webhook";
    // Stripe retry si 5xx
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
