import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import { canPartnership } from "../_rules";
import { getViewer } from "../_viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { targetUserId?: unknown; message?: unknown }
    | null;

  const targetUserId = String(body?.targetUserId ?? "");
  const message = String(body?.message ?? "").trim();

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Paramètre targetUserId manquant." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, accountType: true, isCertified: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const allowed = canPartnership(viewer, target);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.reason }, { status: 403 });
  }

  const existing = await prisma.partnershipRequest.findUnique({
    where: { fromId_toId: { fromId: viewer.id, toId: target.id } },
    select: { id: true, status: true },
  });

  if (existing) {
    return NextResponse.json({ requestId: existing.id, status: existing.status });
  }

  const created = await prisma.partnershipRequest.create({
    data: { fromId: viewer.id, toId: target.id, message: message || null },
    select: { id: true, status: true },
  });

  return NextResponse.json({ requestId: created.id, status: created.status });
}
