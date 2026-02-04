import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import { getViewer } from "../../_viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { action?: unknown }
    | null;
  const action = String(body?.action ?? "").toUpperCase();
  if (action !== "ACCEPT" && action !== "REJECT") {
    return NextResponse.json(
      { error: "Action invalide (ACCEPT|REJECT)." },
      { status: 400 },
    );
  }

  const existing = await prisma.partnershipRequest.findUnique({
    where: { id: requestId },
    select: { id: true, toId: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (existing.toId !== viewer.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json({ ok: true });
  }

  await prisma.partnershipRequest.update({
    where: { id: requestId },
    data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
  });

  return NextResponse.json({ ok: true });
}
