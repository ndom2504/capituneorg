
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "image/png", 
  "image/jpeg", 
  "image/webp", 
  "image/gif",
  "application/pdf",
  "application/msword", 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", 
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", 
  "text/csv"
]);

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 10) return ext;
  return fallbackExt;
}

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.messaging) {
    return NextResponse.json({ error: "Messaging disabled." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non supporté." }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10MB)." }, { status: 413 });
  }

  const ext = safeExt(file.name, ".bin");
  const filename = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  // Use Vercel Blob if available
  if (blobToken) {
    try {
      const blob = await put(`messages/${filename}`, buffer, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ 
        url: blob.url, 
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });
    } catch (e) {
      console.error("Blob upload error:", e);
      return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
    }
  }

  // Fallback to local storage
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "messages");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const url = `/uploads/messages/${filename}`;
  return NextResponse.json({ 
    url, 
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type
  });
}
