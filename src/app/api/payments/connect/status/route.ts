import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux professionnels." }, { status: 403 });
  }

  const account = await prisma.stripeConnectedAccount.findUnique({
    where: { userId: viewer.id },
    select: {
      id: true,
      stripeAccountId: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirementsDueJson: true,
      updatedAt: true,
    },
  });

  const ready = account
    ? account.payoutsEnabled === true && account.detailsSubmitted === true
    : false;

  return NextResponse.json({ ok: true, account, ready });
}
