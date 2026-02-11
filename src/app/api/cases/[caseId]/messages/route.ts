import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMessagingEnabled(flags: Record<string, unknown>) {
  return flags.messaging !== false;
}

function isSafeUpload(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("/uploads/");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  
  const flags = await getFeatureFlagsFromDb();
  if (!isMessagingEnabled(flags)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      requesterId: true,
      professionalId: true,
      requesterLastReadAt: true,
      professionalLastReadAt: true,
    },
  });

  if (!c) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });

  const isParticipant = c.requesterId === viewer.id || c.professionalId === viewer.id;
  const isAdmin = viewer.accountType === "ADMIN";
  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const messages = await prisma.caseMessage.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      authorId: true,
      body: true,
      fileUrl: true,
      fileName: true,
      createdAt: true,
      author: { select: { fullName: true, avatarUrl: true, accountType: true } },
    },
  });

  // Marquer comme lu pour le viewer si participant
  if (isParticipant) {
    const now = new Date();
    const data = c.requesterId === viewer.id
      ? { requesterLastReadAt: now }
      : { professionalLastReadAt: now };
    await prisma.case.update({ where: { id: caseId }, data });
  }

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      authorId: m.authorId,
      authorName: m.author.fullName,
      authorAvatarUrl: m.author.avatarUrl,
      authorRole: m.author.accountType,
      body: m.body,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  
  const flags = await getFeatureFlagsFromDb();
  if (!isMessagingEnabled(flags)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, requesterId: true, professionalId: true },
  });

  if (!c) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });

  const isRequester = c.requesterId === viewer.id;
  const isProfessional = c.professionalId === viewer.id;
  if (!isRequester && !isProfessional) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const bodyJson = (await req.json().catch(() => null)) as {
    body?: string;
    fileUrl?: string;
    fileName?: string;
  } | null;

  if (!bodyJson) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const text = (bodyJson.body ?? "").trim();
  const fileUrl = bodyJson.fileUrl?.trim() || null;
  const fileName = bodyJson.fileName?.trim() || null;

  if (!text && !fileUrl) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  if (fileUrl && !isSafeUpload(fileUrl)) {
    return NextResponse.json({ error: "URL de fichier invalide." }, { status: 400 });
  }

  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.caseMessage.create({
      data: {
        caseId,
        authorId: viewer.id,
        body: text || null,
        fileUrl,
        fileName,
      },
      select: {
        id: true,
        authorId: true,
        body: true,
        fileUrl: true,
        fileName: true,
        createdAt: true,
      },
    }),
    prisma.case.update({
      where: { id: caseId },
      data: {
        lastActivityAt: now,
        requesterLastReadAt: isRequester ? now : undefined,
        professionalLastReadAt: isProfessional ? now : undefined,
      },
    }),
  ]);

  return NextResponse.json({
    message: {
      ...message,
      createdAt: message.createdAt.toISOString(),
    },
  });
}
