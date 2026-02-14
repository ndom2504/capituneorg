import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import admin from "firebase-admin";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFirebaseAdminApp, getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type UploadResult = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  slot: string | null;
  status: "PENDING" | "VALIDATED" | "REJECTED";
  updatedAt: string;
};

type CaseDocumentRow = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  slot: string | null;
  status: "PENDING" | "VALIDATED" | "REJECTED";
  updatedAt: Date;
};

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && origin.startsWith("http") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  } as const;
}

function getBearerToken(req: NextRequest) {
  const raw = req.headers.get("authorization") ?? "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function normalizeBucketName(raw: string | null | undefined): string | null {
  let name = raw?.trim();
  if (!name) return null;
  if (name.startsWith("gs://")) name = name.slice("gs://".length);
  const slashIdx = name.indexOf("/");
  if (slashIdx >= 0) name = name.slice(0, slashIdx);
  return name || null;
}

function getFirebaseBucketCandidates(): string[] {
  const primary = normalizeBucketName(
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  );
  if (!primary) return [];

  const candidates = [primary];

  const firebasestorageMatch = primary.match(/^(.+)\.firebasestorage\.app$/);
  if (firebasestorageMatch?.[1]) {
    candidates.push(`${firebasestorageMatch[1]}.appspot.com`);
  }

  const appspotMatch = primary.match(/^(.+)\.appspot\.com$/);
  if (appspotMatch?.[1]) {
    candidates.push(`${appspotMatch[1]}.firebasestorage.app`);
  }

  return Array.from(new Set(candidates));
}

function isBucketNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.toLowerCase();
  return (
    m.includes("specified bucket does not exist") ||
    m.includes("no such bucket") ||
    m.includes("bucket does not exist") ||
    m.includes("not found")
  );
}

function safeExt(filename: string, fallbackExt: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext && ext.length <= 10) return ext;
  return fallbackExt;
}

async function uploadToFirebaseStorage(args: {
  caseId: string;
  file: File;
}): Promise<string> {
  const bucketCandidates = getFirebaseBucketCandidates();
  if (!bucketCandidates.length) {
    throw new Error(
      "Firebase Storage bucket non configuré. Définissez FIREBASE_STORAGE_BUCKET (recommandé) ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
    );
  }

  const ext = safeExt(args.file.name, ".bin");
  const objectPath = `uploads/cases/${args.caseId}/${randomUUID()}${ext}`;

  const token = randomUUID();
  const arrayBuffer = await args.file.arrayBuffer();

  // Initialise l'app Admin (credentials + bucket optionnel)
  getFirebaseAdminApp();

  let lastErr: unknown = null;
  for (const bucketName of bucketCandidates) {
    try {
      const bucket = admin.storage().bucket(bucketName);
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
    } catch (e) {
      lastErr = e;
      if (isBucketNotFoundError(e)) continue;
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(
    `Firebase Storage bucket inaccessible. Essayés: ${bucketCandidates.join(", ")}. Dernière erreur: ${msg}`,
  );
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> },
) {
  const origin = req.headers.get("origin");

  const { id } = await params;
  const caseId = (id ?? "").trim();
  if (!caseId) {
    return NextResponse.json(
      { error: "id requis." },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    return NextResponse.json(
      { error: "Authorization Bearer token requis." },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  let decoded: { email?: string };
  try {
    const auth = getFirebaseAdminAuth();
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json(
      { error: "Token Firebase invalide." },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  const email = (decoded.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Email indisponible dans le token." },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  // Upsert viewer
  const viewer = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: email.split("@")[0] || "Utilisateur",
    },
    select: { id: true, accountType: true },
  });

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, requesterId: true, professionalId: true },
  });

  if (!c) {
    return NextResponse.json(
      { error: "Dossier introuvable." },
      { status: 404, headers: corsHeaders(origin) },
    );
  }

  const isAdmin = viewer.accountType === "ADMIN";
  const isRequester = viewer.id === c.requesterId;
  if (!isAdmin && !isRequester) {
    return NextResponse.json(
      { error: "Accès refusé." },
      { status: 403, headers: corsHeaders(origin) },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Téléversement impossible (fichier trop volumineux ou invalide). Max 10MB." },
      { status: 413, headers: corsHeaders(origin) },
    );
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Fichier manquant (champ 'file')." },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (PDF, PNG, JPEG, WEBP)." },
      { status: 415, headers: corsHeaders(origin) },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10MB)." },
      { status: 413, headers: corsHeaders(origin) },
    );
  }

  const rawSlot = String(form.get("slot") ?? "").trim();
  const slot = rawSlot ? rawSlot.slice(0, 50) : null;

  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const hasFirebaseBucket = getFirebaseBucketCandidates().length > 0;

  let url: string;
  try {
    if (isProd) {
      if (!hasFirebaseBucket) {
        throw new Error(
          "Stockage fichiers non configuré en production. Définissez FIREBASE_STORAGE_BUCKET ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
        );
      }
      url = await uploadToFirebaseStorage({ caseId, file });
    } else {
      const ext = safeExt(file.name, ".bin");
      const filename = `${caseId}-${randomUUID()}${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "cases");
      await mkdir(uploadsDir, { recursive: true });
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(path.join(uploadsDir, filename), Buffer.from(arrayBuffer));
      url = `/uploads/cases/${filename}`;
    }

    const doc = (slot
      ? await (async () => {
          const existing = await prisma.caseDocument.findFirst({
            where: { caseId, slot },
            select: { id: true },
          });

          if (existing?.id) {
            return prisma.caseDocument.update({
              where: { id: existing.id },
              data: {
                name: file.name,
                url,
                mimeType: file.type,
                sizeBytes: file.size,
                status: "PENDING",
              } as never,
            });
          }

          return prisma.caseDocument.create({
            data: {
              caseId,
              slot,
              name: file.name,
              url,
              mimeType: file.type,
              sizeBytes: file.size,
              status: "PENDING",
            } as never,
          });
        })()
      : await prisma.caseDocument.create({
          data: {
            caseId,
            name: file.name,
            url,
            mimeType: file.type,
            sizeBytes: file.size,
            status: "PENDING",
          } as never,
        })) as unknown as CaseDocumentRow;

    const result: UploadResult = {
      id: doc.id,
      name: doc.name,
      url: doc.url,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      slot: doc.slot,
      status: doc.status,
      updatedAt: doc.updatedAt.toISOString(),
    };

    return NextResponse.json({ item: result }, { status: 201, headers: corsHeaders(origin) });
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    const safeMessage = rawMessage
      .replace(/-----BEGIN[\s\S]*?PRIVATE KEY-----/g, "[REDACTED]")
      .replace(/-----END[\s\S]*?PRIVATE KEY-----/g, "[REDACTED]");

    return NextResponse.json(
      { error: safeMessage || "Erreur serveur pendant le téléversement." },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
