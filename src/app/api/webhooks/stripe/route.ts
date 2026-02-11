import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  if (!signature) {
    return new NextResponse("Missing Stripe Signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error(`[STRIPE_WEBHOOK_ERROR] ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const orderId = session.metadata?.orderId;
    const eventId = session.metadata?.eventId;
    const userId = session.metadata?.userId;

    if (!orderId || !eventId || !userId) {
      console.error("[STRIPE_WEBHOOK_ERROR] Missing metadata in session", session.id);
      return new NextResponse("Webhook Error: Missing metadata", { status: 400 });
    }

    try {
      // transac: update order and registration
      await prisma.$transaction([
        prisma.eventOrder.update({
          where: { id: orderId },
          data: { status: "PAID" },
        }),
        prisma.eventRegistration.upsert({
          where: {
            eventId_userId: {
              eventId: eventId,
              userId: userId,
            },
          },
          update: {
            status: "REGISTERED",
          },
          create: {
            eventId: eventId,
            userId: userId,
            status: "REGISTERED",
          },
        })
      ]);
      console.log(`[STRIPE_WEBHOOK] Order ${orderId} confirmed and user registered.`);
    } catch (dbErr: any) {
      console.error(`[STRIPE_WEBHOOK_DB_ERROR] ${dbErr.message}`);
      return new NextResponse("Database Error", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
