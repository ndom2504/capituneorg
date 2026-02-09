import { NextRequest, NextResponse } from "next/server";

import { requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestListItem = {
  id: string;
  status: string;
  topic: string | null;
  urgency: string | null;
  message: string | null;
  proNote: string | null;
  acceptedAt: string | null;
  closedByClientAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  requester: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
  };
  professional: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
  };
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const openOnlyRaw = (req.nextUrl.searchParams.get("openOnly") ?? "").trim();
  const openOnly = openOnlyRaw === "1" || openOnlyRaw.toLowerCase() === "true";

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const items = await prisma.marketplaceRequest.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(openOnly ? { closedByClientAt: null } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { requesterId: { contains: q, mode: "insensitive" } },
              { professionalId: { contains: q, mode: "insensitive" } },
              { requester: { fullName: { contains: q, mode: "insensitive" } } },
              { requester: { email: { contains: q, mode: "insensitive" } } },
              { professional: { fullName: { contains: q, mode: "insensitive" } } },
              { professional: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastActivityAt: "desc" }],
    take: limit,
    include: {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
          accountType: true,
          accountStatus: true,
        },
      },
      professional: {
        select: {
          id: true,
          fullName: true,
          email: true,
          accountType: true,
          accountStatus: true,
        },
      },
    },
  });

  const payload: RequestListItem[] = items.map((r) => ({
    id: r.id,
    status: String(r.status),
    topic: r.topic ? String(r.topic) : null,
    urgency: r.urgency ? String(r.urgency) : null,
    message: r.message,
    proNote: r.proNote,
    acceptedAt: toIso(r.acceptedAt),
    closedByClientAt: toIso(r.closedByClientAt),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    lastActivityAt: r.lastActivityAt.toISOString(),
    requester: {
      id: r.requester.id,
      fullName: r.requester.fullName,
      email: r.requester.email,
      accountType: String(r.requester.accountType),
      accountStatus: String(r.requester.accountStatus),
    },
    professional: {
      id: r.professional.id,
      fullName: r.professional.fullName,
      email: r.professional.email,
      accountType: String(r.professional.accountType),
      accountStatus: String(r.professional.accountStatus),
    },
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}
