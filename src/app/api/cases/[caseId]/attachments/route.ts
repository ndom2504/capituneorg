import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function isMessagingEnabled(flags: Record<string, unknown>) {
  return flags.messaging !== false;
}

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 6) return ext;
  return fallbackExt;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  
  const flags = await getFeatureFlagsFromDb();
  if (!isMessagingEnabled(flags)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: { requesterId: true, professionalId: true },
  });
  if (!c) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });

  const isParticipant = viewer.id === c.requesterId || viewer.id === c.professionalId;
  const isAdmin = viewer.accountType === "ADMIN";
  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Type non supporté (PDF, PNG, JPEG, WEBP)." }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10MB)." }, { status: 413 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "cases");
  await mkdir(uploadsDir, { recursive: true });

  const fallbackExt = file.type.startsWith("image/") ? ".png" : ".pdf";
  const ext = safeExt(file.name, fallbackExt);
  const filename = `case-${caseId}-${crypto.randomUUID()}${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(path.join(uploadsDir, filename), Buffer.from(arrayBuffer));

  const fileUrl = `/uploads/cases/${filename}`;

  return NextResponse.json({ fileUrl, fileName: file.name || filename });
}
