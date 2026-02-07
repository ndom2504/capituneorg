import { NextRequest, NextResponse } from "next/server";

import { requireAdminActionViewer, requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { AuditAction, JobPostingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JobListItem = {
  id: string;
  title: string;
  status: string;
  jobType: string;
  domain: string;
  experienceLevel: string;
  city: string | null;
  province: string | null;
  remote: boolean;
  languages: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  poster: { id: string; fullName: string; email: string | null };
  applicationsCount: number;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const items = await prisma.jobPosting.findMany({
    where: {
      ...(status
        ? {
            status: status as any,
          }
        : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { poster: { fullName: { contains: q, mode: "insensitive" } } },
              { poster: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      poster: { select: { id: true, fullName: true, email: true } },
      _count: { select: { applications: true } },
    },
  });

  const payload: JobListItem[] = items.map((j) => ({
    id: j.id,
    title: j.title,
    status: String(j.status),
    jobType: String(j.jobType),
    domain: String(j.domain),
    experienceLevel: String(j.experienceLevel),
    city: j.city,
    province: j.province,
    remote: j.remote,
    languages: String(j.languages),
    publishedAt: toIso(j.publishedAt),
    closedAt: toIso(j.closedAt),
    createdAt: j.createdAt.toISOString(),
    poster: { id: j.poster.id, fullName: j.poster.fullName, email: j.poster.email ?? null },
    applicationsCount: j._count.applications,
  }));

  return NextResponse.json({
    canAct: auth.viewer.adminRole === "ADMIN",
    items: payload,
  });
}

type ActionBody =
  | { action: "PUBLISH"; jobId: string }
  | { action: "CLOSE"; jobId: string };

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const jobId = (body as any)?.jobId;
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "jobId requis." }, { status: 400 });
  }

  const action = (body as any)?.action;
  if (action !== "PUBLISH" && action !== "CLOSE") {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.jobPosting.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, publishedAt: true, closedAt: true, title: true },
    });
    if (!before) return { ok: false as const, error: "Offre introuvable." };

    if (action === "PUBLISH") {
      if (before.status !== JobPostingStatus.DRAFT) {
        return { ok: false as const, error: "Seules les offres DRAFT peuvent être publiées." };
      }

      const after = await tx.jobPosting.update({
        where: { id: jobId },
        data: { status: JobPostingStatus.PUBLISHED, publishedAt: new Date(), closedAt: null },
        select: { id: true, status: true, publishedAt: true, closedAt: true, title: true },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: AuditAction.PUBLISH_JOB,
          objectType: "JobPosting",
          objectId: jobId,
          beforeJson: {
            ...before,
            publishedAt: before.publishedAt ? before.publishedAt.toISOString() : null,
            closedAt: before.closedAt ? before.closedAt.toISOString() : null,
            status: String(before.status),
          },
          afterJson: {
            ...after,
            publishedAt: after.publishedAt ? after.publishedAt.toISOString() : null,
            closedAt: after.closedAt ? after.closedAt.toISOString() : null,
            status: String(after.status),
          },
        },
      });

      return { ok: true as const };
    }

    // CLOSE
    if (before.status !== JobPostingStatus.PUBLISHED) {
      return { ok: false as const, error: "Seules les offres PUBLISHED peuvent être clôturées." };
    }

    const after = await tx.jobPosting.update({
      where: { id: jobId },
      data: { status: JobPostingStatus.CLOSED, closedAt: new Date() },
      select: { id: true, status: true, publishedAt: true, closedAt: true, title: true },
    });

    await tx.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: AuditAction.CLOSE_JOB,
        objectType: "JobPosting",
        objectId: jobId,
        beforeJson: {
          ...before,
          publishedAt: before.publishedAt ? before.publishedAt.toISOString() : null,
          closedAt: before.closedAt ? before.closedAt.toISOString() : null,
          status: String(before.status),
        },
        afterJson: {
          ...after,
          publishedAt: after.publishedAt ? after.publishedAt.toISOString() : null,
          closedAt: after.closedAt ? after.closedAt.toISOString() : null,
          status: String(after.status),
        },
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
