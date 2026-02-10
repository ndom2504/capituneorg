import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireAdminActionViewer } from "@/app/api/admin/_auth";
import { getCommunityRules } from "@/app/api/user-posts/_community";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { isProdRuntime, uploadToFirebaseStorage } from "@/lib/server/firebase-storage-upload";

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

export async function POST(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  const rules = await getCommunityRules();
  if (!rules.allowImages) {
    return NextResponse.json({ error: "Les images/vidéos sont désactivées." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Téléversement impossible (fichier trop volumineux ou invalide)." },
      { status: 413 },
    );
  }

  const file = form.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier manquant (champ 'file')." }, { status: 400 });
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
        error: isVideo ? "Vidéo trop volumineuse (max 25MB)." : "Image trop volumineuse (max 5MB).",
      },
      { status: 413 },
    );
  }

  const mediaType = isVideo ? "VIDEO" : "IMAGE";

  try {
    const fallbackExt = isVideo ? ".mp4" : ".png";
    const ext = safeExt(file.name, fallbackExt);
    const id = randomUUID();

    let url: string;

    if (isProdRuntime()) {
      const objectPath = `uploads/posts/admin/${auth.viewer.id}/official-${id}${ext}`;
      url = await uploadToFirebaseStorage({ objectPath, file });
    } else {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "posts");
      await mkdir(uploadsDir, { recursive: true });
      const filename = `official-${auth.viewer.id}-${id}${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(path.join(uploadsDir, filename), Buffer.from(arrayBuffer));
      url = `/uploads/posts/${filename}`;
    }

    return NextResponse.json({ ok: true, mediaUrl: url, mediaType });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erreur serveur pendant le téléversement: ${msg}` },
      { status: 500 },
    );
  }
}
