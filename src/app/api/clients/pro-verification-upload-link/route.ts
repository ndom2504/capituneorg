import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { createProVerificationUploadToken } from "@/lib/auth/pro-verification-upload-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPublicBaseUrl(req: NextRequest) {
  // Important: avoid using Vercel's deployment URL (VERCEL_URL) here.
  // When a deployment is protected, links to the *.vercel.app domain can
  // redirect to a Vercel authentication page after scanning the QR.
  // By default we use the actual request origin (custom domain in prod).
  // If you need to override (e.g. behind a proxy or for dev), set
  // CAPITUNE_PUBLIC_APP_URL explicitly.
  const raw = process.env.CAPITUNE_PUBLIC_APP_URL;

  if (raw && raw.trim()) {
    const trimmed = raw.trim();
    const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      // Fall through to request origin
    }
  }

  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const existing = await prisma.marketplaceProfile.findUnique({
    where: { userId: auth.viewer.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Enregistrez d’abord un brouillon de profil pour activer le scan via QR." },
      { status: 400 },
    );
  }

  const token = await createProVerificationUploadToken(auth.viewer.id);
  const url = new URL("/pro-verification/upload", getPublicBaseUrl(req));
  url.searchParams.set("t", token);

  return NextResponse.json({ url: url.toString(), expiresInSec: 60 * 15 });
}
