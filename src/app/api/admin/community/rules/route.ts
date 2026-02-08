import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import {
  CommunityBannedWordsAction,
  CommunityCommentMode,
  CommunityPublishMode,
  AuditAction,
} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function normalizeBannedWords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 200) break;
  }

  return out;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.min(Math.max(i, min), max);
}

export async function GET() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const row = await prisma.communityRules.upsert({
    where: { singleton: 1 },
    update: {},
    create: { singleton: 1 },
    select: {
      id: true,
      publishMode: true,
      commentMode: true,
      allowLinks: true,
      allowImages: true,
      spamPostCooldownSeconds: true,
      maxPostsPerDay: true,
      bannedWords: true,
      bannedWordsAction: true,
      updatedAt: true,
      updatedByAdmin: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  const bannedWords = (() => {
    try {
      const parsed = JSON.parse(row.bannedWords);
      return normalizeBannedWords(parsed);
    } catch {
      return [];
    }
  })();

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    rules: {
      publishMode: row.publishMode,
      commentMode: row.commentMode,
      allowLinks: row.allowLinks,
      allowImages: row.allowImages,
      spamPostCooldownSeconds: row.spamPostCooldownSeconds,
      maxPostsPerDay: row.maxPostsPerDay,
      bannedWords,
      bannedWordsAction: row.bannedWordsAction,
    },
    meta: {
      updatedAt: toIso(row.updatedAt),
      updatedByAdmin: row.updatedByAdmin,
    },
  });
}

type UpdateBody = {
  publishMode?: CommunityPublishMode;
  commentMode?: CommunityCommentMode;
  allowLinks?: boolean;
  allowImages?: boolean;
  spamPostCooldownSeconds?: number;
  maxPostsPerDay?: number;
  bannedWords?: string[];
  bannedWordsAction?: CommunityBannedWordsAction;
};

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const publishMode = body.publishMode;
  const commentMode = body.commentMode;
  const bannedWordsAction = body.bannedWordsAction;

  const allowedPublish = new Set(Object.values(CommunityPublishMode));
  const allowedComment = new Set(Object.values(CommunityCommentMode));
  const allowedBanned = new Set(Object.values(CommunityBannedWordsAction));

  if (publishMode != null && !allowedPublish.has(publishMode)) {
    return NextResponse.json({ error: "publishMode invalide." }, { status: 400 });
  }
  if (commentMode != null && !allowedComment.has(commentMode)) {
    return NextResponse.json({ error: "commentMode invalide." }, { status: 400 });
  }
  if (bannedWordsAction != null && !allowedBanned.has(bannedWordsAction)) {
    return NextResponse.json({ error: "bannedWordsAction invalide." }, { status: 400 });
  }

  const allowLinks = typeof body.allowLinks === "boolean" ? body.allowLinks : undefined;
  const allowImages = typeof body.allowImages === "boolean" ? body.allowImages : undefined;
  const spamPostCooldownSeconds =
    body.spamPostCooldownSeconds == null
      ? undefined
      : clampInt(body.spamPostCooldownSeconds, 3600, 0, 86400);
  const maxPostsPerDay =
    body.maxPostsPerDay == null ? undefined : clampInt(body.maxPostsPerDay, 3, 0, 50);

  const bannedWords = body.bannedWords == null ? undefined : normalizeBannedWords(body.bannedWords);
  const bannedWordsJson = bannedWords ? JSON.stringify(bannedWords) : undefined;

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.communityRules.upsert({
      where: { singleton: 1 },
      update: {},
      create: { singleton: 1 },
      select: {
        id: true,
        publishMode: true,
        commentMode: true,
        allowLinks: true,
        allowImages: true,
        spamPostCooldownSeconds: true,
        maxPostsPerDay: true,
        bannedWords: true,
        bannedWordsAction: true,
        updatedByAdminId: true,
        updatedAt: true,
      },
    });

    const after = await tx.communityRules.update({
      where: { id: before.id },
      data: {
        ...(publishMode != null ? { publishMode } : {}),
        ...(commentMode != null ? { commentMode } : {}),
        ...(allowLinks != null ? { allowLinks } : {}),
        ...(allowImages != null ? { allowImages } : {}),
        ...(spamPostCooldownSeconds != null ? { spamPostCooldownSeconds } : {}),
        ...(maxPostsPerDay != null ? { maxPostsPerDay } : {}),
        ...(bannedWordsJson != null ? { bannedWords: bannedWordsJson } : {}),
        ...(bannedWordsAction != null ? { bannedWordsAction } : {}),
        updatedByAdminId: auth.viewer.id,
      },
      select: {
        id: true,
        publishMode: true,
        commentMode: true,
        allowLinks: true,
        allowImages: true,
        spamPostCooldownSeconds: true,
        maxPostsPerDay: true,
        bannedWords: true,
        bannedWordsAction: true,
        updatedByAdminId: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: AuditAction.UPDATE_COMMUNITY_RULES,
        objectType: "CommunityRules",
        objectId: before.id,
        beforeJson: before,
        afterJson: after,
      },
    });

    return after;
  });

  const parsedBannedWords = (() => {
    try {
      return normalizeBannedWords(JSON.parse(result.bannedWords));
    } catch {
      return [];
    }
  })();

  return NextResponse.json({
    ok: true,
    rules: {
      publishMode: result.publishMode,
      commentMode: result.commentMode,
      allowLinks: result.allowLinks,
      allowImages: result.allowImages,
      spamPostCooldownSeconds: result.spamPostCooldownSeconds,
      maxPostsPerDay: result.maxPostsPerDay,
      bannedWords: parsedBannedWords,
      bannedWordsAction: result.bannedWordsAction,
    },
    meta: {
      updatedAt: toIso(result.updatedAt),
    },
  });
}
