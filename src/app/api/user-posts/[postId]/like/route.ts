import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { getCommunityViewer } from "@/app/api/user-posts/_community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getCommunityViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (viewer.accountStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Compte indisponible." }, { status: 403 });
  }
  if (viewer.communityBannedAt) {
    return NextResponse.json({ error: "Accès communauté suspendu." }, { status: 403 });
  }

  const { postId } = await context.params;

  const post = await prisma.userPost.findUnique({
    where: { id: postId },
    select: { id: true, isHidden: true, targetAccountType: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  const isAdmin = viewer.accountType === "ADMIN";
  if (!isAdmin && post.isHidden) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }
  if (!isAdmin && post.targetAccountType && post.targetAccountType !== viewer.accountType) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
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
