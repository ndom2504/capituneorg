import { NextRequest, NextResponse } from "next/server";

import { requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistrationItem = {
  user: {
    id: string;
    fullName: string;
    email: string;
    accountStatus: string;
    accountType: string;
    isCertified: boolean;
    createdAt: string;
  };
  createdAt: string;
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const { eventId } = await ctx.params;
  if (!eventId) {
    return NextResponse.json({ error: "eventId requis." }, { status: 400 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const rows = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      ...(q
        ? {
            user: {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          accountStatus: true,
          accountType: true,
          isCertified: true,
          createdAt: true,
        },
      },
    },
  });

  const items: RegistrationItem[] = rows.map((r) => ({
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.user.id,
      fullName: r.user.fullName,
      email: r.user.email,
      accountStatus: String(r.user.accountStatus),
      accountType: String(r.user.accountType),
      isCertified: r.user.isCertified,
      createdAt: r.user.createdAt.toISOString(),
    },
  }));

  return NextResponse.json({ items });
}
