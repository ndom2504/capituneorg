import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(value: string | undefined, max: number) {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.length > max ? v.slice(0, max) : v;
}

function isMessagingEnabled(flags: Record<string, unknown>) {
  // Par défaut on active si non explicitement désactivé.
  return flags.messaging !== false;
}

export async function GET() {
  const flags = await getFeatureFlagsFromDb();
  if (!isMessagingEnabled(flags)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const isAdmin = viewer.accountType === "ADMIN";

  const rows = await prisma.case.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [{ requesterId: viewer.id }, { professionalId: viewer.id }],
        },
    orderBy: { lastActivityAt: "desc" },
    take: 50,
    include: {
      requester: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
      professional: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, body: true, fileName: true, fileUrl: true, authorId: true, createdAt: true },
      },
    },
  });

  const cases = rows.map((c) => {
    const lastMessage = c.messages[0] ?? null;
    const isRequester = c.requesterId === viewer.id;
    const lastRead = isRequester ? c.requesterLastReadAt : c.professionalLastReadAt;
    const unread =
      lastMessage &&
      lastMessage.authorId !== viewer.id &&
      (!lastRead || lastMessage.createdAt > lastRead)
        ? 1
        : 0;

    return {
      id: c.id,
      status: c.status,
      title: c.title,
      description: c.description,
      serviceId: c.serviceId,
      lastActivityAt: c.lastActivityAt.toISOString(),
      requester: c.requester,
      professional: c.professional,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            body: lastMessage.body,
            fileName: lastMessage.fileName,
            fileUrl: lastMessage.fileUrl,
            authorId: lastMessage.authorId,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      unreadCount: unread,
      viewerRole: isRequester ? "REQUESTER" : "PROFESSIONAL",
    };
  });

  return NextResponse.json({ cases });
}

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!isMessagingEnabled(flags)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json({ error: "Seuls les demandeurs peuvent créer un dossier." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    professionalId?: string;
    title?: string;
    description?: string;
    serviceId?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const professionalId = (body.professionalId ?? "").trim();
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId requis." }, { status: 400 });
  }

  const professional = await prisma.user.findUnique({
    where: { id: professionalId },
    select: { id: true, accountType: true },
  });

  if (!professional || professional.accountType !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Professionnel introuvable." }, { status: 404 });
  }

  const title = clamp(body.title, 140);
  const description = clamp(body.description, 2000);

  if (!title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Description requise." }, { status: 400 });

  const now = new Date();

  const created = await prisma.case.create({
    data: {
      requesterId: viewer.id,
      professionalId: professional.id,
      serviceId: body.serviceId ?? null,
      title,
      description,
      status: "PENDING",
      lastActivityAt: now,
      requesterLastReadAt: now,
    },
    select: {
      id: true,
      status: true,
      title: true,
      description: true,
      serviceId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    case: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
