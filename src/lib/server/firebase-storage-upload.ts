import admin from "firebase-admin";
import { randomUUID } from "node:crypto";

import { getFirebaseAdminApp } from "@/lib/firebase/admin";

function normalizeBucketName(raw: string | null | undefined): string | null {
  let name = raw?.trim();
  if (!name) return null;

  if (name.startsWith("gs://")) name = name.slice("gs://".length);

  const slashIdx = name.indexOf("/");
  if (slashIdx >= 0) name = name.slice(0, slashIdx);

  return name || null;
}

export function getFirebaseBucketCandidates(): string[] {
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

export function isProdRuntime(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export async function uploadToFirebaseStorage(args: {
  objectPath: string;
  file: File;
}): Promise<string> {
  const bucketCandidates = getFirebaseBucketCandidates();
  if (!bucketCandidates.length) {
    throw new Error(
      "Firebase Storage bucket non configuré. Définissez FIREBASE_STORAGE_BUCKET (recommandé) ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
    );
  }

  const token = randomUUID();
  const arrayBuffer = await args.file.arrayBuffer();

  getFirebaseAdminApp();

  let lastErr: unknown = null;
  for (const bucketName of bucketCandidates) {
    try {
      const bucket = admin.storage().bucket(bucketName);
      await bucket.file(args.objectPath).save(Buffer.from(arrayBuffer), {
        contentType: args.file.type || undefined,
        resumable: false,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });

      const encoded = encodeURIComponent(args.objectPath);
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
