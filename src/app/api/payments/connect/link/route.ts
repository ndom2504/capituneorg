import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { requireStripe } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  returnUrl?: string;
  refreshUrl?: string;
};

function asAbsoluteUrl(value: string | undefined, origin: string) {
  const v = (value ?? "").trim();
  if (!v) return `${origin}/accueil`;
  try {
    return new URL(v, origin).toString();
  } catch {
    return `${origin}/accueil`;
  }
}

export async function POST(req: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux professionnels." }, { status: 403 });
  }

  const origin = new URL(req.url).origin;

  const body = (await req.json().catch(() => null)) as Body | null;
  const returnUrl = asAbsoluteUrl(body?.returnUrl, origin);
  const refreshUrl = asAbsoluteUrl(body?.refreshUrl, origin);

  const stripe = requireStripe();

  let connect = await prisma.stripeConnectedAccount.findUnique({
    where: { userId: viewer.id },
    select: { id: true, stripeAccountId: true },
  });

  if (!connect) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "CA",
      email: viewer.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { userId: viewer.id },
    });

    connect = await prisma.stripeConnectedAccount.create({
      data: {
        userId: viewer.id,
        stripeAccountId: account.id,
        chargesEnabled: account.charges_enabled === true,
        payoutsEnabled: account.payouts_enabled === true,
        detailsSubmitted: account.details_submitted === true,
        requirementsDueJson: account.requirements?.currently_due?.length
          ? (account.requirements.currently_due as unknown as any)
          : null,
      },
      select: { id: true, stripeAccountId: true },
    });
  }

  const link = await stripe.accountLinks.create({
    account: connect.stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ ok: true, url: link.url });
}
