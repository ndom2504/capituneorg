import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { requireStripe } from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux professionnels." }, { status: 403 });
  }

  const existing = await prisma.stripeConnectedAccount.findUnique({
    where: { userId: viewer.id },
    select: {
      id: true,
      stripeAccountId: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirementsDueJson: true,
    },
  });

  const stripe = requireStripe();

  if (existing) {
    // Best-effort resync depuis Stripe
    try {
      const account = await stripe.accounts.retrieve(existing.stripeAccountId);
      await prisma.stripeConnectedAccount.update({
        where: { id: existing.id },
        data: {
          chargesEnabled: account.charges_enabled === true,
          payoutsEnabled: account.payouts_enabled === true,
          detailsSubmitted: account.details_submitted === true,
          requirementsDueJson: account.requirements?.currently_due?.length
            ? (account.requirements.currently_due as unknown as any)
            : null,
        },
      });
    } catch {
      // ignore
    }

    const refreshed = await prisma.stripeConnectedAccount.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        stripeAccountId: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        requirementsDueJson: true,
      },
    });

    return NextResponse.json({ ok: true, account: refreshed });
  }

  // Express account (recommandé pour marketplace)
  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    email: viewer.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: {
      userId: viewer.id,
    },
  });

  const created = await prisma.stripeConnectedAccount.create({
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
    select: {
      id: true,
      stripeAccountId: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirementsDueJson: true,
    },
  });

  return NextResponse.json({ ok: true, account: created });
}
