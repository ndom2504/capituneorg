import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import { canFollow } from "../_rules";
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
    | { targetUserId?: unknown }
    | null;

  const targetUserId = String(body?.targetUserId ?? "");
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

  const allowed = canFollow(viewer, target);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.reason }, { status: 403 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } },
    select: { followerId: true },
  });

  if (existing) {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } },
    });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({
    data: { followerId: viewer.id, followingId: target.id },
  });

  return NextResponse.json({ following: true });
}
