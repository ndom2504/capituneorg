import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getViewer } from "@/app/api/marketplace/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx"]);

function sanitizeOriginalName(filename: string) {
  const base = path.basename(filename || "document");
  const clean = base.replace(/[\u0000-\u001F<>:"/\\|?*]+/g, "-").trim();
  if (!clean) return "document";
  return clean.length > 120 ? clean.slice(0, 120) : clean;
}

function safeExt(filename: string, mime: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext;
  if (mime === "application/pdf") return ".pdf";
  if (mime === "application/msword") return ".doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  return ".pdf";
}

export async function POST(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (viewer.accountType !== "USER") {
    return NextResponse.json({ error: "Seuls les demandeurs peuvent téléverser un CV." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant (champ 'file')." }, { status: 400 });
  }

  const mime = file.type || "";
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_MIME.has(mime) && !ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez PDF, DOC ou DOCX." },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10MB)." },
      { status: 413 },
    );
  }

  const storageExt = safeExt(file.name, mime);
  const filename = `cv-${viewer.id}-${crypto.randomUUID()}${storageExt}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "cv");
  await mkdir(uploadsDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(path.join(uploadsDir, filename), Buffer.from(arrayBuffer));

  return NextResponse.json({
    url: `/uploads/cv/${filename}`,
    fileName: sanitizeOriginalName(file.name),
  });
}
