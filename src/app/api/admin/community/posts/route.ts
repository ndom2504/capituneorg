import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostListItem = {
  id: string;
  user: { id: string; fullName: string; email: string };
  title: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: "NONE" | "IMAGE" | "VIDEO";
  isAdminPost: boolean;
  targetAccountType: "USER" | "PROFESSIONAL" | "ADMIN" | null;
  isHidden: boolean;
  commentsLocked: boolean;
  pinnedAt: string | null;
  likes: number;
  shares: number;
  createdAt: string;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const whereHidden =
    status === "HIDDEN" ? { isHidden: true } : status === "VISIBLE" ? { isHidden: false } : {};

  const items = await prisma.userPost.findMany({
    where: {
      ...whereHidden,
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
              { user: { fullName: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      mediaUrl: true,
      mediaType: true,
      isAdminPost: true,
      targetAccountType: true,
      isHidden: true,
      commentsLocked: true,
      pinnedAt: true,
      likes: true,
      shares: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  const payload: PostListItem[] = items.map((it) => ({
    id: it.id,
    user: it.user,
    title: it.title,
    content: it.content,
    mediaUrl: it.mediaUrl,
    mediaType: it.mediaType,
    isAdminPost: it.isAdminPost,
    targetAccountType: it.targetAccountType,
    isHidden: it.isHidden,
    commentsLocked: it.commentsLocked,
    pinnedAt: toIso(it.pinnedAt),
    likes: it.likes,
    shares: it.shares,
    createdAt: it.createdAt.toISOString(),
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}

type ActionBody =
  | { action: "HIDE"; postId: string }
  | { action: "RESTORE"; postId: string }
  | { action: "LOCK_COMMENTS"; postId: string }
  | { action: "UNLOCK_COMMENTS"; postId: string }
  | { action: "PIN"; postId: string }
  | { action: "UNPIN"; postId: string };

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const postId = (body as any)?.postId;
  if (!postId || typeof postId !== "string") {
    return NextResponse.json({ error: "postId requis." }, { status: 400 });
  }

  const action = (body as any)?.action;
  const allowed = new Set(["HIDE", "RESTORE", "LOCK_COMMENTS", "UNLOCK_COMMENTS", "PIN", "UNPIN"]);
  if (!allowed.has(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.userPost.findUnique({
      where: { id: postId },
      select: { id: true, isHidden: true, commentsLocked: true, pinnedAt: true },
    });
    if (!before) return { ok: false as const, error: "Post introuvable." };

    let data: any = {};
    let auditAction: AuditAction;

    switch (action) {
      case "HIDE":
        data = { isHidden: true };
        auditAction = AuditAction.HIDE_POST;
        break;
      case "RESTORE":
        data = { isHidden: false };
        auditAction = AuditAction.RESTORE_POST;
        break;
      case "LOCK_COMMENTS":
        data = { commentsLocked: true };
        auditAction = AuditAction.LOCK_COMMENTS;
        break;
      case "UNLOCK_COMMENTS":
        data = { commentsLocked: false };
        auditAction = AuditAction.UNLOCK_COMMENTS;
        break;
      case "PIN":
        data = { pinnedAt: now };
        auditAction = AuditAction.PIN_POST;
        break;
      default:
        data = { pinnedAt: null };
        auditAction = AuditAction.UNPIN_POST;
        break;
    }

    const after = await tx.userPost.update({
      where: { id: postId },
      data,
      select: { id: true, isHidden: true, commentsLocked: true, pinnedAt: true },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: auditAction,
        objectType: "UserPost",
        objectId: postId,
        beforeJson: before,
        afterJson: after,
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
