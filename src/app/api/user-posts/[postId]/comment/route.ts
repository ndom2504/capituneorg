import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getViewer() {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  return prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const { postId } = await context.params;
  const body = (await req.json().catch(() => null)) as
    | { message?: unknown }
    | null;
  const message = String(body?.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  const post = await prisma.userPost.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  if (post.userId !== viewer.id) {
    return NextResponse.json(
      { error: "Pas d’interaction entre utilisateurs: commentaire interdit." },
      { status: 403 },
    );
  }

  const created = await prisma.userPostComment.create({
    data: {
      postId,
      userId: viewer.id,
      message,
    },
    select: { id: true, message: true, createdAt: true },
  });

  const count = await prisma.userPostComment.count({ where: { postId } });

  return NextResponse.json({
    comment: {
      id: created.id,
      message: created.message,
      createdAt: created.createdAt.toISOString(),
    },
    commentsCount: count,
  });
}
