import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

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
  _req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const { postId } = await context.params;

  const post = await prisma.userPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  const existing = await prisma.userPostLike.findUnique({
    where: { postId_userId: { postId, userId: viewer.id } },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.userPostLike.delete({
        where: { postId_userId: { postId, userId: viewer.id } },
      });
      const updated = await tx.userPost.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
        select: { likes: true },
      });
      return { liked: false, likes: updated.likes };
    }

    await tx.userPostLike.create({ data: { postId, userId: viewer.id } });
    const updated = await tx.userPost.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
    return { liked: true, likes: updated.likes };
  });

  return NextResponse.json(result);
}
