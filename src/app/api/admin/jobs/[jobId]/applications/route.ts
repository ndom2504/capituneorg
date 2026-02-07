import { NextRequest, NextResponse } from "next/server";

import { requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApplicationItem = {
  id: string;
  status: string;
  cvUrl: string;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
    isCertified: boolean;
  };
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const { jobId } = await ctx.params;
  if (!jobId) {
    return NextResponse.json({ error: "jobId requis." }, { status: 400 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const rows = await prisma.jobApplication.findMany({
    where: {
      jobId,
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { applicant: { id: { contains: q, mode: "insensitive" } } },
              { applicant: { fullName: { contains: q, mode: "insensitive" } } },
              { applicant: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      applicant: {
        select: {
          id: true,
          fullName: true,
          email: true,
          accountType: true,
          accountStatus: true,
          isCertified: true,
        },
      },
    },
  });

  const items: ApplicationItem[] = rows.map((a) => ({
    id: a.id,
    status: String(a.status),
    cvUrl: a.cvUrl,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    applicant: {
      id: a.applicant.id,
      fullName: a.applicant.fullName,
      email: a.applicant.email,
      accountType: String(a.applicant.accountType),
      accountStatus: String(a.applicant.accountStatus),
      isCertified: a.applicant.isCertified,
    },
  }));

  return NextResponse.json({ items });
}
