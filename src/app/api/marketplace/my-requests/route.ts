import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "NEEDS_INFO":
      return "Infos requises";
    case "ACCEPTED":
      return "Acceptée";
    case "REJECTED":
      return "Refusée";
    default:
      return status;
  }
}

function topicLabel(topic: string | null) {
  switch (topic) {
    case "ETUDES":
      return "Études";
    case "TRAVAIL":
      return "Travail";
    case "ENTREPRENEUR":
      return "Entrepreneur";
    case "DOCUMENTS":
      return "Documents";
    case "BUDGET":
      return "Budget";
    case "INSTALLATION":
      return "Installation";
    case "ORIENTATION":
      return "Orientation";
    case "IMMIGRATION":
      return "Immigration";
    case "FAMILLE":
      return "Famille";
    case "INTEGRATION":
      return "Intégration";
    case "FORMATION":
      return "Formation";
    case "AUTRE":
      return "Autre";
    default:
      return "—";
  }
}

export async function GET(req: NextRequest) {
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

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  type FindManyArgs = NonNullable<Parameters<typeof prisma.marketplaceRequest.findMany>[0]>;
  const where: FindManyArgs["where"] = {
    requesterId: viewer.id,
    ...(status ? { status: status as never } : {}),
  };

  const requests = await prisma.marketplaceRequest.findMany({
    where,
    include: {
      professional: { select: { id: true, fullName: true, avatarUrl: true } },
      meeting: { select: { id: true, startsAt: true, durationMin: true, locationUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, senderRole: true, kind: true, body: true, fileUrl: true, fileName: true, createdAt: true },
      },
    },
    orderBy: [{ lastActivityAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({
    items: requests.map((r) => {
      const last = r.messages[0] ?? null;
      const unread = last
        ? !r.requesterLastReadAt || last.createdAt > r.requesterLastReadAt
        : false;

      return {
        id: r.id,
        status: r.status,
        statusLabel: statusLabel(r.status),
        topic: r.topic,
        topicLabel: topicLabel(r.topic),
        urgency: r.urgency,
        preferredTimeframe: r.preferredTimeframe,
        createdAt: r.createdAt.toISOString(),
        lastActivityAt: r.lastActivityAt.toISOString(),
        unread,
        professional: {
          id: r.professional.id,
          fullName: r.professional.fullName,
          avatarUrl: r.professional.avatarUrl,
        },
        meeting: r.meeting
          ? {
              id: r.meeting.id,
              startsAt: r.meeting.startsAt.toISOString(),
              durationMin: r.meeting.durationMin,
              locationUrl: r.meeting.locationUrl,
            }
          : null,
        lastMessage: last
          ? {
              id: last.id,
              senderRole: last.senderRole,
              kind: last.kind,
              body: last.body,
              fileUrl: last.fileUrl,
              fileName: last.fileName,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
      };
    }),
  });
}
