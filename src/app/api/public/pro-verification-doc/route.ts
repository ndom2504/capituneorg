import { NextResponse } from "next/server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { verifyProVerificationUploadToken } from "@/lib/auth/pro-verification-upload-link";
import { isProdRuntime, uploadToFirebaseStorage } from "@/lib/server/firebase-storage-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function extFromFile(file: File) {
  const name = (file.name || "").trim();
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  if (!m) return "";
  return m[1]!.toLowerCase();
}

function safeExt(file: File) {
  const ext = extFromFile(file);
  if (["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) return ext;

  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  if (file.type === "image/heif") return "heif";
  return "";
}

export async function POST(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "FormData invalide." }, { status: 400 });

  const token = String(form.get("t") ?? "").trim();
  if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });

  let userId: string;
  try {
    ({ userId } = await verifyProVerificationUploadToken(token));
  } catch {
    return NextResponse.json({ error: "Lien expiré ou invalide." }, { status: 401 });
  }

  const kind = String(form.get("kind") ?? "").trim();
  if (kind !== "competence" && kind !== "id") {
    return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  if (!file.size || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10MB)." }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PDF ou image)." }, { status: 400 });
  }

  const ext = safeExt(file);
  if (!ext) {
    return NextResponse.json({ error: "Extension non supportée." }, { status: 400 });
  }

  // Le profil doit exister (sinon, on ne sait pas quoi mettre en DB)
  const profile = await prisma.professionalProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Profil introuvable. Ouvrez votre profil sur ordinateur et enregistrez un brouillon d’abord." },
      { status: 400 },
    );
  }

  let url: string;
  let fileName: string;

  if (isProdRuntime()) {
    fileName = `${kind}_${userId}_${Date.now()}_${randomUUID()}.${ext}`;
    const objectPath = `uploads/pro-verification/${userId}/${fileName}`;
    url = await uploadToFirebaseStorage({ objectPath, file });
  } else {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const baseDir = path.join(process.cwd(), "public", "uploads", "pro-verification");
    await mkdir(baseDir, { recursive: true });

    fileName = `${kind}_${userId}_${Date.now()}_${randomUUID()}.${ext}`;
    const filePath = path.join(baseDir, fileName);
    await writeFile(filePath, bytes);
    url = `/uploads/pro-verification/${fileName}`;
  }

  await prisma.professionalProfile.update({
    where: { userId },
    data: kind === "competence" ? { proofUrl: url } : { idProofUrl: url },
  });

  return NextResponse.json({ ok: true, url });
}
