import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

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
  // MVP sécurité: uniquement des URLs locales servies par Next (public/uploads)
  if (!v.startsWith("/uploads/")) return null;
  return v;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Espace réservé aux demandeurs." },
      { status: 403 },
    );
  }

  const { requestId } = await context.params;
  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const text = clampText(body.body, 2000);
  const fileUrl = safeUploadUrl(body.fileUrl);
  const fileName = clampText(body.fileName, 120);

  if (!text && !fileUrl) {
    return NextResponse.json(
      { error: "Message ou document requis." },
      { status: 400 },
    );
  }

  // Valide la possession de la demande
  const exists = await prisma.marketplaceRequest.findFirst({
    where: { id: requestId, requesterId: viewer.id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const now = new Date();
  const msg = await prisma.marketplaceRequestMessage.create({
    data: {
      requestId,
      senderRole: "REQUESTER",
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
    data: {
      lastActivityAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, message: { id: msg.id, createdAt: msg.createdAt.toISOString() } });
}
