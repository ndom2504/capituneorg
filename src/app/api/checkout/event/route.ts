import { NextResponse } from "next/server";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const viewer = await getAppViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json({ error: "eventId requis" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    if (!event.isPaid || !event.price) {
      return NextResponse.json({ error: "Cet événement n'est pas payant" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";

    // 1. Create order
    const order = await prisma.eventOrder.create({
      data: {
        eventId: event.id,
        userId: viewer.id,
        amount: event.price,
        currency: "cad",
        status: "PENDING",
      },
    });

    // 2. Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: event.title,
              description: `Formation/Événement : ${event.title}`,
              images: event.bannerUrl ? [event.bannerUrl.startsWith("http") ? event.bannerUrl : `${origin}${event.bannerUrl}`] : [],
            },
            unit_amount: Math.round(Number(event.price) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/events/${event.slug}?canceled=1`,
      metadata: {
        orderId: order.id,
        eventId: event.id,
        userId: viewer.id,
      },
      customer_email: viewer.email,
    });

    // 3. Update order with stripeSessionId
    await prisma.eventOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[CHECKOUT_EVENT_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de l'initialisation du paiement" }, { status: 500 });
  }
}
