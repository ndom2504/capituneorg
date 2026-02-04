import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES_IMAGE = 5 * 1024 * 1024; // 5MB
const MAX_BYTES_VIDEO = 25 * 1024 * 1024; // 25MB

const ALLOWED_IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 6) return ext;
  return fallbackExt;
}

async function getViewer() {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  const viewer = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return viewer;
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
  content: string;
  mediaUrl: string | null;
  mediaType: "NONE" | "IMAGE" | "VIDEO";
  likes: number;
  shares: number;
  createdAt: Date;
  user: { fullName: string; avatarUrl: string | null };
  _count: { comments: number };
  likesRel: { userId: string }[];
  comments: { id: string; message: string; createdAt: Date }[];
}, viewerId: string) {
  return {
    id: p.id,
    userId: p.userId,
    authorName: p.user.fullName,
    authorAvatarUrl: p.user.avatarUrl,
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
      message: c.message,
      createdAt: c.createdAt.toISOString(),
      createdAtLabel: formatRelativeDate(c.createdAt),
    })),
  };
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const posts = await prisma.userPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      _count: { select: { comments: true } },
      likesRel: { where: { userId: viewer.id }, select: { userId: true } },
      comments: {
        where: { userId: viewer.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, message: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    viewerId: viewer.id,
    posts: posts.map((p) => toApiPost(p, viewer.id)),
  });
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
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

  const created = await prisma.userPost.create({
    data: {
      userId: viewer.id,
      content: content || "",
      mediaUrl,
      mediaType,
    },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      _count: { select: { comments: true } },
      likesRel: { where: { userId: viewer.id }, select: { userId: true } },
      comments: {
        where: { userId: viewer.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, message: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ post: toApiPost(created, viewer.id) });
}
