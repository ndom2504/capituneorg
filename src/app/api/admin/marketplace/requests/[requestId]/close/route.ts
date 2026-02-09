import { NextResponse } from "next/server";

import { requireAdminActionViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ requestId?: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await params;
  const id = (requestId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "requestId requis." }, { status: 400 });
  }

  const existing = await prisma.marketplaceRequest.findUnique({
    where: { id },
    select: { id: true, closedByClientAt: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (existing.closedByClientAt) {
    return NextResponse.json({ error: "Demande déjà clôturée." }, { status: 409 });
  }

  await prisma.marketplaceRequest.update({
    where: { id },
    data: { closedByClientAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
