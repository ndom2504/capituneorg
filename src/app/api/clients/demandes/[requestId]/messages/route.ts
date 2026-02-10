import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  body?: string;
  fileUrl?: string;
  fileName?: string;
};

function clampText(value: string | undefined, max: number) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function safeUploadUrl(value: string | undefined) {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!v.startsWith("/uploads/")) return null;
  return v;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const text = clampText(body.body, 2000);
  const fileUrl = safeUploadUrl(body.fileUrl);
  const fileName = clampText(body.fileName, 120);

  if (!text && !fileUrl) {
    return NextResponse.json({ error: "Message ou document requis." }, { status: 400 });
  }

  const isAdmin = auth.viewer.accountType === "ADMIN";

  const request = await prisma.marketplaceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      professionalId: true,
      professional: { select: { userId: true } },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (!isAdmin && request.professional?.userId !== auth.viewer.id) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  const now = new Date();

  const msg = await prisma.marketplaceRequestMessage.create({
    data: {
      requestId,
      senderRole: "PROFESSIONAL",
      kind: fileUrl ? "FILE" : "TEXT",
      body: text,
      fileUrl,
      fileName,
      createdAt: now,
    },
    select: { id: true, createdAt: true },
  });

  await prisma.marketplaceRequest.update({
    where: { id: requestId },
    data: { lastActivityAt: now },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, message: { id: msg.id, createdAt: msg.createdAt.toISOString() } });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;

  const isAdmin = auth.viewer.accountType === "ADMIN";

  const request = await prisma.marketplaceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, professionalId: true },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (!isAdmin && request.professionalId !== auth.viewer.id) {
    return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
  }

  const messages = await prisma.marketplaceRequestMessage.findMany({
    where: { requestId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderRole: true,
      kind: true,
      body: true,
      fileUrl: true,
      fileName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ messages });
}
