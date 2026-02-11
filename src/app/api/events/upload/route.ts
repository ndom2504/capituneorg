import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 6) return ext;
  return fallbackExt;
}

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (flags.events === false) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer || (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Type non supporté (PNG, JPEG, WEBP)." }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5MB)." }, { status: 413 });
  }

  const ext = safeExt(file.name, ".png");
  const filename = `event-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    const blob = await put(`events/${filename}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ fileUrl: blob.url, fileName: file.name || filename });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "events");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const fileUrl = `/uploads/events/${filename}`;
  return NextResponse.json({ fileUrl, fileName: file.name || filename });
}
