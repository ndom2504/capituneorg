import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && origin.startsWith("http") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  } as const;
}

function getBearerToken(req: NextRequest) {
  const raw = req.headers.get("authorization") ?? "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> },
) {
  const origin = req.headers.get("origin");

  const idToken = getBearerToken(req);
  if (!idToken) {
    return NextResponse.json(
      { error: "Authorization Bearer token requis." },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  let decoded: { email?: string; name?: string; picture?: string };
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

  const createFullName = (() => {
    const n = (decoded.name ?? "").trim();
    if (n) return n;
    const local = email.split("@")[0]?.trim();
    return local || "Utilisateur";
  })();

  const avatarUrl = (decoded.picture ?? "").trim() || null;

  const viewer = await prisma.user.upsert({
    where: { email },
    update: avatarUrl ? { avatarUrl } : {},
    create: {
      email,
      fullName: createFullName,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    select: { id: true, accountType: true },
  });

  const { id } = await params;
  const dossierId = (id ?? "").trim();
  if (!dossierId) {
    return NextResponse.json({ error: "id manquant." }, { status: 400, headers: corsHeaders(origin) });
  }

  const existing = await prisma.case.findUnique({
    where: { id: dossierId },
    select: { id: true, requesterId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404, headers: corsHeaders(origin) });
  }

  const isAdmin = viewer.accountType === "ADMIN";
  const canDelete = isAdmin || existing.requesterId === viewer.id;
  if (!canDelete) {
    return NextResponse.json(
      { error: "Accès refusé." },
      { status: 403, headers: corsHeaders(origin) },
    );
  }

  await prisma.case.delete({ where: { id: dossierId } });

  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}
