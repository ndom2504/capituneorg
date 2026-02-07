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
    select: { userId: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  if (post.userId !== viewer.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez partager que vos propres publications." },
      { status: 403 },
    );
  }

  const updated = await prisma.userPost.update({
    where: { id: postId },
    data: { shares: { increment: 1 } },
    select: { shares: true },
  });

  return NextResponse.json({ shares: updated.shares });
}
