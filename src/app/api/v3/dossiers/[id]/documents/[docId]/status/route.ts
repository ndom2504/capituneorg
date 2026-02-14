import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && origin.startsWith("http") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  } as const;
}

function getBearerToken(req: NextRequest) {
  const raw = req.headers.get("authorization") ?? "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

const ALLOWED = new Set(["VALIDATED", "REJECTED", "PENDING"] as const);

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string; docId?: string }> },
) {
  const origin = req.headers.get("origin");
  const { id, docId } = await params;
  const caseId = (id ?? "").trim();
  const documentId = (docId ?? "").trim();

  if (!caseId || !documentId) {
    return NextResponse.json(
      { error: "Paramètres manquants." },
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
  const isAssignedPro = viewer.id === c.professionalId;
  if (!isAdmin && !isAssignedPro) {
    return NextResponse.json(
      { error: "Accès refusé." },
      { status: 403, headers: corsHeaders(origin) },
    );
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const nextStatus = String(body?.status ?? "").trim().toUpperCase();

  if (!ALLOWED.has(nextStatus as never)) {
    return NextResponse.json(
      { error: "Statut invalide." },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const existing = await prisma.caseDocument.findFirst({
    where: { id: documentId, caseId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Document introuvable." },
      { status: 404, headers: corsHeaders(origin) },
    );
  }

  const updatedRaw = await prisma.caseDocument.update({
    where: { id: documentId },
    data: { status: nextStatus as "PENDING" | "VALIDATED" | "REJECTED" } as never,
  });

  const updated = updatedRaw as unknown as {
    id: string;
    status: "PENDING" | "VALIDATED" | "REJECTED";
    updatedAt: Date;
  };

  return NextResponse.json(
    { ok: true, id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() },
    { status: 200, headers: corsHeaders(origin) },
  );
}
