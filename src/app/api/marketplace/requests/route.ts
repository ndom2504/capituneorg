import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateRequestPayload = {
  professionalId?: string;
  topic?:
    | "ETUDES"
    | "TRAVAIL"
    | "ENTREPRENEUR"
    | "DOCUMENTS"
    | "BUDGET"
    | "INSTALLATION"
    | "ORIENTATION"
    | "IMMIGRATION"
    | "FAMILLE"
    | "INTEGRATION"
    | "FORMATION"
    | "AUTRE";
  urgency?: "LOW" | "MEDIUM" | "HIGH";
  preferredTimeframe?: string;
  message?: string;
  cvUrl?: string;
  cvFileName?: string;
};

function clampText(value: string | undefined, max: number) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function isSafeUploadUrl(url: string | null) {
  if (!url) return false;
  return url.startsWith("/uploads/");
}

export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Seuls les demandeurs peuvent envoyer une demande." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as CreateRequestPayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const professionalId = body.professionalId;
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId requis." }, { status: 400 });
  }

  const profile = await prisma.marketplaceProfile.findFirst({
    where: {
      userId: professionalId,
      status: "PUBLISHED",
      user: { is: { accountType: "PROFESSIONAL", isCertified: true } },
    },
    select: { id: true, userId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  const now = new Date();
  const initialMessage = clampText(body.message, 500);
  const cvUrl = clampText(body.cvUrl, 300);
  const cvFileName = clampText(body.cvFileName, 120);

  if (cvUrl && !isSafeUploadUrl(cvUrl)) {
    return NextResponse.json(
      { error: "cvUrl invalide (doit pointer vers /uploads/...)." },
      { status: 400 },
    );
  }

  const createdMessages: Array<{
    senderRole: "REQUESTER";
    kind: "TEXT" | "FILE";
    body?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    createdAt: Date;
  }> = [];

  if (cvUrl) {
    createdMessages.push({
      senderRole: "REQUESTER",
      kind: "FILE",
      fileUrl: cvUrl,
      fileName: cvFileName ?? "CV",
      createdAt: now,
    });
  }

  if (initialMessage) {
    createdMessages.push({
      senderRole: "REQUESTER",
      kind: "TEXT",
      body: initialMessage,
      createdAt: now,
    });
  }

  const request = await prisma.marketplaceRequest.create({
    data: {
      requesterId: viewer.id,
      professionalId: profile.userId,
      profileId: profile.id,
      topic: body.topic ?? null,
      urgency: body.urgency ?? null,
      preferredTimeframe: clampText(body.preferredTimeframe, 120),
      message: initialMessage,
      lastActivityAt: now,
      requesterLastReadAt: now,
      messages: createdMessages.length ? { create: createdMessages } : undefined,
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    request: {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    },
  });
}
