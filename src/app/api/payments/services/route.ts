import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const url = new URL(req.url);
  const providerUserId = url.searchParams.get("providerUserId");

  const defaultWhere =
    viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN"
      ? { OR: [{ providerUserId: null }, { providerUserId: viewer.id }] }
      : { providerUserId: null as string | null };

  const services = await prisma.paymentService.findMany({
    where: {
      active: true,
      ...(providerUserId
        ? { OR: [{ providerUserId: null }, { providerUserId }] }
        : defaultWhere),
    },
    orderBy: [{ providerUserId: "asc" }, { priceCents: "asc" }],
    select: {
      id: true,
      providerUserId: true,
      title: true,
      description: true,
      priceCents: true,
      currency: true,
      durationMinutes: true,
      active: true,
    },
  });

  return NextResponse.json({ items: services });
}
