import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import {
  findBannedWord,
  getCommunityRules,
  getCommunityViewer,
  roleCanComment,
} from "@/app/api/user-posts/_community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
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
  const body = (await req.json().catch(() => null)) as
    | { message?: unknown }
    | null;
  const message = String(body?.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  const rules = await getCommunityRules();
  if (!roleCanComment(rules.commentMode, viewer.accountType)) {
    return NextResponse.json({ error: "Vous ne pouvez pas commenter pour le moment." }, { status: 403 });
  }

  const post = await prisma.userPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      isHidden: true,
      commentsLocked: true,
      targetAccountType: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  const isAdmin = viewer.accountType === "ADMIN";
  if (!isAdmin && post.isHidden) {
    return NextResponse.json({ error: "Publication indisponible." }, { status: 404 });
  }
  if (!isAdmin && post.targetAccountType && post.targetAccountType !== viewer.accountType) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }
  if (!isAdmin && post.commentsLocked) {
    return NextResponse.json({ error: "Commentaires verrouillés." }, { status: 403 });
  }

  const banned = findBannedWord(message, rules.bannedWords);
  if (banned && rules.bannedWordsAction === "BLOCK") {
    return NextResponse.json({ error: "Commentaire refusé (mots interdits)." }, { status: 403 });
  }

  const hide = Boolean(banned && rules.bannedWordsAction === "HIDE");

  const created = await prisma.userPostComment.create({
    data: {
      postId,
      userId: viewer.id,
      message,
      isHidden: hide,
    },
    select: {
      id: true,
      message: true,
      createdAt: true,
      user: { select: { fullName: true } },
    },
  });

  const countVisible = await prisma.userPostComment.count({
    where: { postId, isHidden: false },
  });

  return NextResponse.json({
    comment: hide
      ? null
      : {
          id: created.id,
          authorName: created.user.fullName,
          message: created.message,
          createdAt: created.createdAt.toISOString(),
        },
    commentsCount: countVisible,
    moderated: hide ? true : false,
  });
}
