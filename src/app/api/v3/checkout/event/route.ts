import { NextRequest, NextResponse } from "next/server";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  idToken?: string;
  eventId?: string;
};

const V3_EVENTS: Record<
  string,
  {
    id: string;
    title: string;
    isPaid: boolean;
    price?: number;
    currency: "cad";
    image?: string;
  }
> = {
  e1: {
    id: "e1",
    title: "Webinaire : Réussir son Entrée Express 2025",
    isPaid: false,
    currency: "cad",
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
  },
  e2: {
    id: "e2",
    title: "Session Info : S’installer au Nouveau-Brunswick",
    isPaid: false,
    currency: "cad",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  },
  e3: {
    id: "e3",
    title: "Formation : Certificat MIFI - Niveau 2",
    isPaid: true,
    price: 149.99,
    currency: "cad",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
  },
};

function corsHeaders(origin: string | null) {
  // On reflète l'origine pour les appels depuis Vite (ex: http://localhost:5173)
  // et on garde une valeur permissive en l'absence d'origine.
  const allowOrigin = origin && origin.startsWith("http") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  } as const;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const body = (await req.json().catch(() => null)) as Payload | null;
    if (!body?.idToken) {
      return NextResponse.json({ error: "idToken requis." }, { status: 400, headers: corsHeaders(origin) });
    }
    if (!body?.eventId) {
      return NextResponse.json({ error: "eventId requis." }, { status: 400, headers: corsHeaders(origin) });
    }

    const event = V3_EVENTS[body.eventId];
    if (!event) {
      return NextResponse.json({ error: "Événement inconnu." }, { status: 404, headers: corsHeaders(origin) });
    }
    if (!event.isPaid || !event.price) {
      return NextResponse.json(
        { error: "Cet événement n'est pas payant." },
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    let decoded: { email?: string };
    let uid: string | null = null;
    try {
      const auth = getFirebaseAdminAuth();
      decoded = await auth.verifyIdToken(body.idToken);
      const tokenUid = (decoded as { uid?: unknown }).uid;
      uid = typeof tokenUid === "string" && tokenUid ? tokenUid : null;
    } catch {
      return NextResponse.json({ error: "Token Firebase invalide." }, { status: 401, headers: corsHeaders(origin) });
    }

    const successBase = origin && origin.startsWith("http") ? origin : process.env.NEXT_PUBLIC_APP_URL || "";
    if (!successBase) {
      return NextResponse.json(
        { error: "Origin/APP_URL manquant pour construire les URLs de retour." },
        { status: 500, headers: corsHeaders(origin) },
      );
    }

    const successUrl = `${successBase}/?payment=success&eventId=${encodeURIComponent(event.id)}#events`;
    const cancelUrl = `${successBase}/?payment=canceled&eventId=${encodeURIComponent(event.id)}#events`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: event.currency,
            product_data: {
              name: event.title,
              description: `Capitune V3 – ${event.title}`,
              images: event.image ? [event.image] : [],
            },
            unit_amount: Math.round(Number(event.price) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        source: "capitune-v3",
        eventId: event.id,
        firebaseUid: uid ?? "",
      },
      ...(decoded.email ? { customer_email: decoded.email } : {}),
    });

    return NextResponse.json({ url: session.url }, { status: 200, headers: corsHeaders(origin) });
  } catch (error) {
    console.error("[V3_CHECKOUT_EVENT_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation du paiement." },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
