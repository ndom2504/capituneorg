import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import {
  contentContainsLink,
  findBannedWord,
  getCommunityRules,
  getCommunityViewer,
  roleCanPublish,
} from "@/app/api/user-posts/_community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function rejectIfCommunityDisabled() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return null;
}


const MAX_BYTES_IMAGE = 5 * 1024 * 1024; // 5MB
const MAX_BYTES_VIDEO = 25 * 1024 * 1024; // 25MB

const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 6) return ext;
  return fallbackExt;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 2) return "à l’instant";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "Hier" : `Il y a ${diffDays} jours`;
}

function toApiPost(p: {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: "NONE" | "IMAGE" | "VIDEO";
  targetAccountType: "USER" | "PROFESSIONAL" | "ADMIN" | null;
  isAdminPost: boolean;
  isHidden: boolean;
  commentsLocked: boolean;
  pinnedAt: Date | null;
  likes: number;
  shares: number;
  createdAt: Date;
  user: { fullName: string; avatarUrl: string | null };
  _count: { comments: number };
  likesRel: { userId: string }[];
  comments: { id: string; message: string; createdAt: Date; user: { fullName: string } }[];
}, viewerId: string) {
  return {
    id: p.id,
    userId: p.userId,
    authorName: p.user.fullName,
    authorAvatarUrl: p.user.avatarUrl,
    title: p.title,
    targetAccountType: p.targetAccountType,
    isAdminPost: p.isAdminPost,
    isHidden: p.isHidden,
    commentsLocked: p.commentsLocked,
    pinnedAt: p.pinnedAt ? p.pinnedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    createdAtLabel: formatRelativeDate(p.createdAt),
    content: p.content,
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    likes: p.likes,
    shares: p.shares,
    commentsCount: p._count.comments,
    likedByViewer: p.likesRel.length > 0,
    isMine: p.userId === viewerId,
    comments: p.comments.map((c) => ({
      id: c.id,
      authorName: c.user.fullName,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
      createdAtLabel: formatRelativeDate(c.createdAt),
    })),
  };
}

export async function GET() {
  const rejected = await rejectIfCommunityDisabled();
  if (rejected) return rejected;

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

  const canSeeAll = viewer.accountType === "ADMIN";

  const posts = await prisma.userPost.findMany({
    where: {
      isHidden: false,
      ...(canSeeAll
        ? {}
        : {
            OR: [{ targetAccountType: null }, { targetAccountType: viewer.accountType }],
          }),
    },
    orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }],
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      _count: { select: { comments: { where: { isHidden: false } } } },
      likesRel: { where: { userId: viewer.id }, select: { userId: true } },
      comments: {
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, message: true, createdAt: true, user: { select: { fullName: true } } },
      },
    },
  });

  return NextResponse.json({
    viewerId: viewer.id,
    posts: posts.map((p) => toApiPost(p, viewer.id)),
  });
}

export async function POST(req: Request) {
  const rejected = await rejectIfCommunityDisabled();
  if (rejected) return rejected;

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

  const rules = await getCommunityRules();
  if (!roleCanPublish(rules.publishMode, viewer.accountType)) {
    return NextResponse.json({ error: "Vous ne pouvez pas publier pour le moment." }, { status: 403 });
  }

  const form = await req.formData();
  const content = String(form.get("content") ?? "").trim();
  const file = form.get("file");

  if (!content && (!file || !(file instanceof File) || file.size === 0)) {
    return NextResponse.json(
      { error: "Ajoutez du texte ou un média (image/vidéo)." },
      { status: 400 },
    );
  }

  let mediaUrl: string | null = null;
  let mediaType: "NONE" | "IMAGE" | "VIDEO" = "NONE";

  if (file && file instanceof File && file.size > 0) {
    if (!rules.allowImages) {
      return NextResponse.json({ error: "Les images/vidéos sont désactivées." }, { status: 403 });
    }

    const isImage = ALLOWED_IMAGE_MIME.has(file.type);
    const isVideo = ALLOWED_VIDEO_MIME.has(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez PNG/JPEG/WebP ou MP4/WebM." },
        { status: 415 },
      );
    }

    const maxBytes = isVideo ? MAX_BYTES_VIDEO : MAX_BYTES_IMAGE;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: isVideo
            ? "Vidéo trop volumineuse (max 25MB)."
            : "Image trop volumineuse (max 5MB).",
        },
        { status: 413 },
      );
    }

    mediaType = isVideo ? "VIDEO" : "IMAGE";

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "posts");
    await mkdir(uploadsDir, { recursive: true });

    const fallbackExt = isVideo ? ".mp4" : ".png";
    const ext = safeExt(file.name, fallbackExt);
    const filename = `post-${viewer.id}-${crypto.randomUUID()}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(path.join(uploadsDir, filename), Buffer.from(arrayBuffer));

    mediaUrl = `/uploads/posts/${filename}`;
  }

  if (!rules.allowLinks && contentContainsLink(content)) {
    return NextResponse.json({ error: "Les liens sont désactivés." }, { status: 403 });
  }

  if (viewer.accountType !== "ADMIN") {
    const now = new Date();
    const cooldownStart = new Date(now.getTime() - rules.spamPostCooldownSeconds * 1000);
    const recent = await prisma.userPost.findFirst({
      where: { userId: viewer.id, createdAt: { gte: cooldownStart } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (recent) {
      return NextResponse.json({ error: "Veuillez attendre avant de republier." }, { status: 429 });
    }

    const today = await prisma.userPost.count({
      where: { userId: viewer.id, createdAt: { gte: startOfDay(now) } },
    });
    if (today >= rules.maxPostsPerDay) {
      return NextResponse.json({ error: "Limite quotidienne atteinte." }, { status: 429 });
    }
  }

  const banned = findBannedWord(content, rules.bannedWords);
  if (banned && rules.bannedWordsAction === "BLOCK") {
    return NextResponse.json({ error: "Contenu refusé (mots interdits)." }, { status: 403 });
  }

  const created = await prisma.userPost.create({
    data: {
      userId: viewer.id,
      content: content || "",
      mediaUrl,
      mediaType,
      isHidden: Boolean(banned && rules.bannedWordsAction === "HIDE"),
    },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      _count: { select: { comments: { where: { isHidden: false } } } },
      likesRel: { where: { userId: viewer.id }, select: { userId: true } },
      comments: {
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, message: true, createdAt: true, user: { select: { fullName: true } } },
      },
    },
  });

  return NextResponse.json({ post: toApiPost(created, viewer.id) });
}
