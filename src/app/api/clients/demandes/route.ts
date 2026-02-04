import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function topicLabel(value: string | null) {
  switch (value) {
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
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const isAdmin = auth.viewer.accountType === "ADMIN";

  type FindManyArgs = NonNullable<Parameters<typeof prisma.marketplaceRequest.findMany>[0]>;
  const where: FindManyArgs["where"] = {
    ...(isAdmin ? {} : { professionalId: auth.viewer.id }),
    ...(status ? { status: status as never } : {}),
  };

  const items = await prisma.marketplaceRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, fullName: true, avatarUrl: true } },
      professional: { select: { id: true, fullName: true } },
      meeting: { select: { id: true, startsAt: true, durationMin: true, locationUrl: true } },
      messages: {
        where: { kind: "FILE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { fileUrl: true, fileName: true, createdAt: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      status: r.status,
      topic: r.topic,
      topicLabel: topicLabel(r.topic),
      urgency: r.urgency,
      preferredTimeframe: r.preferredTimeframe,
      message: r.message,
      proNote: r.proNote,
      createdAt: r.createdAt.toISOString(),
      cv: r.messages[0]?.fileUrl
        ? {
            url: r.messages[0].fileUrl,
            name: r.messages[0].fileName ?? "Document",
            createdAt: r.messages[0].createdAt.toISOString(),
          }
        : null,
      requester: {
        id: r.requester.id,
        fullName: r.requester.fullName,
        avatarUrl: r.requester.avatarUrl,
      },
      meeting: r.meeting
        ? {
            id: r.meeting.id,
            startsAt: r.meeting.startsAt.toISOString(),
            durationMin: r.meeting.durationMin,
            locationUrl: r.meeting.locationUrl,
          }
        : null,
    })),
  });
}
