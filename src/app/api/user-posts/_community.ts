import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import type {
  CommunityBannedWordsAction,
  CommunityCommentMode,
  CommunityPublishMode,
} from "@prisma/client";

export type CommunityViewer = {
  id: string;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED" | "DELETED";
  communityBannedAt: Date | null;
};

export type CommunityRulesSnapshot = {
  publishMode: CommunityPublishMode;
  commentMode: CommunityCommentMode;
  allowLinks: boolean;
  allowImages: boolean;
  spamPostCooldownSeconds: number;
  maxPostsPerDay: number;
  bannedWords: string[];
  bannedWordsAction: CommunityBannedWordsAction;
};

export async function getCommunityViewer(): Promise<CommunityViewer | null> {
  const viewer = await getAppViewer();
  if (!viewer) return null;

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: {
      id: true,
      accountType: true,
      accountStatus: true,
      communityBannedAt: true,
    },
  });

  return user;
}

function parseBannedWords(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((w) => (typeof w === "string" ? w.trim() : ""))
        .filter(Boolean)
        .slice(0, 200);
    }
  } catch {
    // ignore
  }
  return [];
}

export async function getCommunityRules(): Promise<CommunityRulesSnapshot> {
  const row = await prisma.communityRules.upsert({
    where: { singleton: 1 },
    update: {},
    create: {
      singleton: 1,
    },
    select: {
      publishMode: true,
      commentMode: true,
      allowLinks: true,
      allowImages: true,
      spamPostCooldownSeconds: true,
      maxPostsPerDay: true,
      bannedWords: true,
      bannedWordsAction: true,
    },
  });

  return {
    publishMode: row.publishMode,
    commentMode: row.commentMode,
    allowLinks: row.allowLinks,
    allowImages: row.allowImages,
    spamPostCooldownSeconds: row.spamPostCooldownSeconds,
    maxPostsPerDay: row.maxPostsPerDay,
    bannedWords: parseBannedWords(row.bannedWords),
    bannedWordsAction: row.bannedWordsAction,
  };
}

export function roleCanPublish(mode: CommunityPublishMode, accountType: CommunityViewer["accountType"]) {
  if (accountType === "ADMIN") return true;
  if (mode === "ADMIN_ONLY") return false;
  if (mode === "PRO_ONLY") return accountType === "PROFESSIONAL";
  return true;
}

export function roleCanComment(mode: CommunityCommentMode, accountType: CommunityViewer["accountType"]) {
  if (accountType === "ADMIN") return true;
  if (mode === "ADMIN_ONLY") return false;
  if (mode === "PRO_ONLY") return accountType === "PROFESSIONAL";
  return true;
}

export function contentContainsLink(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("http://") || t.includes("https://") || t.includes("www.");
}

export function findBannedWord(text: string, bannedWords: string[]): string | null {
  if (!text) return null;
  const haystack = text.toLowerCase();
  for (const raw of bannedWords) {
    const w = raw.toLowerCase();
    if (!w) continue;
    if (haystack.includes(w)) return raw;
  }
  return null;
}
