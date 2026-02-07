import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import admin from "firebase-admin";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function getFirebaseBucketName(): string | null {
  const raw =
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    null;
  let name = raw?.trim();
  if (!name) return null;

  // Accepte aussi les formats gs://bucket-name
  if (name.startsWith("gs://")) name = name.slice("gs://".length);

  return name ? name : null;
}

async function uploadToFirebaseStorage(args: {
  userId: string;
  kind: "avatar" | "cover";
  file: File;
}): Promise<string> {
  const bucketName = getFirebaseBucketName();
  if (!bucketName) {
    throw new Error("Firebase Storage bucket non configuré.");
  }

  // Initialise l'app Admin (credentials) et récupère un bucket explicitement.
  getFirebaseAdminApp();
  const bucket = admin.storage().bucket(bucketName);

  const ext = safeExt(args.file.name);
  const objectPath = `uploads/users/${args.userId}/${args.kind}-${randomUUID()}${ext}`;

  const token = randomUUID();
  const arrayBuffer = await args.file.arrayBuffer();

  await bucket.file(objectPath).save(Buffer.from(arrayBuffer), {
    contentType: args.file.type || undefined,
    resumable: false,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

async function updateUserMediaUrl(userId: string, kind: "avatar" | "cover", url: string) {
  try {
    if (kind === "avatar") {
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { coverUrl: url } });
    }
    return;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fallback si Prisma n'arrive pas à se connecter (souvent pool/concurrence en dev).
    if (!msg.toLowerCase().includes("connection pool")) throw e;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw e;

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(connectionString);

    if (kind === "avatar") {
      await sql`UPDATE "User" SET "avatarUrl" = ${url} WHERE "id" = ${userId};`;
    } else {
      await sql`UPDATE "User" SET "coverUrl" = ${url} WHERE "id" = ${userId};`;
    }
  }
}

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return ext;
  return ".png";
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    console.error("[user-media] Invalid multipart body", e);
    return NextResponse.json(
      { error: "Téléversement impossible (fichier trop volumineux ou invalide). Max 5MB." },
      { status: 413 },
    );
  }

  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  if (kind !== "avatar" && kind !== "cover") {
    return NextResponse.json(
      { error: "Paramètre 'kind' invalide (avatar|cover)." },
      { status: 400 },
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Fichier manquant (champ 'file')." },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez PNG, JPEG ou WebP." },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5MB)." },
      { status: 413 },
    );
  }

  // Récupérer l'utilisateur connecté
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 },
    );
  }

  try {
    const ext = safeExt(file.name);

    const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    const hasFirebaseBucket = Boolean(getFirebaseBucketName());

    let url: string;

    // En prod, privilégier un stockage externe (pas de FS local).
    if (isProd) {
      if (!hasFirebaseBucket) {
        throw new Error(
          "Stockage média non configuré en production. Définissez FIREBASE_STORAGE_BUCKET ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
        );
      }
      url = await uploadToFirebaseStorage({
        userId: user.id,
        kind: kind as "avatar" | "cover",
        file,
      });
    } else {
      const filename = `${kind}-${user.id}-${randomUUID()}${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(path.join(uploadsDir, filename), Buffer.from(arrayBuffer));
      url = `/uploads/${filename}`;
    }

    await updateUserMediaUrl(user.id, kind as "avatar" | "cover", url);
    return NextResponse.json({ url });
  } catch (e) {
    const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    const rawMessage = e instanceof Error ? e.message : String(e);
    const safeMessage = rawMessage
      .replace(/-----BEGIN[\s\S]*?PRIVATE KEY-----/g, "[REDACTED]")
      .replace(/-----END[\s\S]*?PRIVATE KEY-----/g, "[REDACTED]");

    console.error("[user-media] Upload failed", {
      kind,
      fileName: file instanceof File ? file.name : undefined,
      fileType: file instanceof File ? file.type : undefined,
      fileSize: file instanceof File ? file.size : undefined,
      error: e,
    });

    return NextResponse.json(
      {
        error: isProd
          ? `Erreur serveur pendant le téléversement: ${safeMessage}`
          : "Erreur serveur pendant le téléversement. Réessaie dans quelques secondes.",
      },
      { status: 500 },
    );
  }
}
