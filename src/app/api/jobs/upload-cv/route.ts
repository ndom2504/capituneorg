import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB pour les CV
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
]);

function safeExt(filename: string, mimeType: string) {
  const ext = path.extname(filename).toLowerCase();
  if ([".pdf", ".doc", ".docx"].includes(ext)) return ext;
  // Fallback basé sur le MIME type
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType.includes("wordprocessing")) return ".docx";
  return ".pdf";
}

/**
 * POST /api/jobs/upload-cv
 * Upload d'un CV pour candidature (V1 : PDF uniquement recommandé)
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Fichier manquant (champ 'file')." },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez PDF (recommandé), DOC ou DOCX." },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10MB)." },
      { status: 413 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 },
    );
  }

  const ext = safeExt(file.name, file.type);
  const timestamp = Date.now();
  const filename = `cv-${user.id}-${timestamp}${ext}`;

  // Stockage : cvs/{userId}/
  const cvsDir = path.join(process.cwd(), "public", "cvs", user.id);
  await mkdir(cvsDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(path.join(cvsDir, filename), Buffer.from(arrayBuffer));

  const url = `/cvs/${user.id}/${filename}`;

  return NextResponse.json({ url });
}
