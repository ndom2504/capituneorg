import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  title?: string | null;
  content: string;
  targetAccountType?: "USER" | "PROFESSIONAL" | "ADMIN" | null;
};

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const titleRaw = typeof body.title === "string" ? body.title.trim() : "";
  const title = titleRaw ? titleRaw.slice(0, 140) : null;

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Contenu requis." }, { status: 400 });
  }

  const target = body.targetAccountType ?? null;
  const allowedTargets = new Set([null, "USER", "PROFESSIONAL", "ADMIN"]);
  if (!allowedTargets.has(target as any)) {
    return NextResponse.json({ error: "targetAccountType invalide." }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.userPost.create({
      data: {
        userId: auth.viewer.id,
        isAdminPost: true,
        title,
        content: content.slice(0, 8000),
        targetAccountType: target,
        mediaType: "NONE",
      },
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        targetAccountType: true,
        isAdminPost: true,
        isHidden: true,
        commentsLocked: true,
        pinnedAt: true,
        createdAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: AuditAction.PUBLISH_ADMIN_POST,
        objectType: "UserPost",
        objectId: post.id,
        afterJson: post,
      },
    });

    return post;
  });

  return NextResponse.json({ ok: true, postId: created.id });
}
