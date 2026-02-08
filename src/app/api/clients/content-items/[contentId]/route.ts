import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(value: string | null) {
  const v = (value ?? "").trim();
  return v ? v : null;
}

function intOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

type UpdatePayload = {
  title?: string;
  description?: string;
  language?: string;

  // Event
  eventType?: "LIVE" | "ATELIER" | "QA";
  eventStatus?: "DRAFT" | "PUBLISHED" | "FULL" | "ENDED" | "CANCELLED";
  startsAt?: string;
  durationMin?: number;
  timezone?: string;
  liveUrl?: string | null;
  replayUrl?: string | null;
  capacity?: number | null;
  targetRole?: "ALL" | "DEMANDEUR" | "PRO";
  imageUrl?: string | null;

  // Training
  trainingFormat?: "VIDEO" | "RESOURCES" | "MIXED";
  publishStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  level?: string | null;
  videoUrl?: string | null;
  objectives?: string[];
  resources?: string[];

  // Monetization
  isPaid?: boolean;
  priceCents?: number | null;
  currency?: string | null;
  stripePriceId?: string | null;
};

async function getProVerification(viewerId: string) {
  const profile = await prisma.marketplaceProfile.findUnique({
    where: { userId: viewerId },
    select: { isVerified: true, verificationStatus: true },
  });

  return {
    hasMarketplaceProfile: !!profile,
    isVerified: profile?.isVerified === true || profile?.verificationStatus === "VERIFIED",
  };
}

async function findItemOr404(contentId: string) {
  const item = await prisma.contentItem.findUnique({
    where: { id: contentId },
    include: { _count: { select: { enrollments: true } } },
  });
  return item;
}

function canMutate({ viewer, item }: { viewer: { id: string; accountType: string }; item: { ownerId: string } }) {
  if (viewer.accountType === "ADMIN") return true;
  return viewer.id === item.ownerId;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { contentId } = await params;

  const item = await findItemOr404(contentId);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!canMutate({ viewer: auth.viewer, item })) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  return NextResponse.json({
    item: {
      ...item,
      startsAt: item.startsAt ? item.startsAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      enrollmentsCount: item._count.enrollments,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { contentId } = await params;

  const item = await findItemOr404(contentId);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!canMutate({ viewer: auth.viewer, item })) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as UpdatePayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const title = body.title != null ? (body.title ?? "").trim() : undefined;
  const description = body.description != null ? (body.description ?? "").trim() : undefined;
  const language = body.language != null ? (body.language ?? "").trim().toLowerCase() : undefined;

  if (title !== undefined && !title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (description !== undefined && !description) return NextResponse.json({ error: "Description requise." }, { status: 400 });
  if (language !== undefined && language !== "fr" && language !== "en") {
    return NextResponse.json({ error: "Langue invalide (fr|en)." }, { status: 400 });
  }

  const verification = await getProVerification(item.ownerId);

  const nextIsPaid = body.isPaid != null ? body.isPaid === true : item.isPaid;
  const nextPriceCents = body.priceCents != null ? intOrNull(body.priceCents) : item.priceCents;

  if (nextIsPaid) {
    if (!nextPriceCents || nextPriceCents <= 0) {
      return NextResponse.json({ error: "Prix requis si payant." }, { status: 400 });
    }
  }

  // Publication payante réservée aux pros vérifiés (reco CAPITUNE)
  if (item.type === "EVENT") {
    const requestedStatus = body.eventStatus ?? item.eventStatus ?? "DRAFT";
    if (requestedStatus === "PUBLISHED" && nextIsPaid && !verification.isVerified) {
      return NextResponse.json({ error: "Publication payante réservée aux pros vérifiés." }, { status: 403 });
    }
  } else {
    const requestedStatus = body.publishStatus ?? item.publishStatus;
    if (requestedStatus === "PUBLISHED" && nextIsPaid && !verification.isVerified) {
      return NextResponse.json({ error: "Publication payante réservée aux pros vérifiés." }, { status: 403 });
    }
  }

  const objectives = Array.isArray(body.objectives)
    ? body.objectives.map((s) => s.trim()).filter(Boolean).slice(0, 30)
    : undefined;
  const resources = Array.isArray(body.resources)
    ? body.resources.map((s) => s.trim()).filter(Boolean).slice(0, 50)
    : undefined;

  const updated = await prisma.contentItem.update({
    where: { id: contentId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(language !== undefined ? { language } : {}),

      // Event fields
      ...(body.eventType !== undefined ? { eventType: body.eventType } : {}),
      ...(body.eventStatus !== undefined ? { eventStatus: body.eventStatus } : {}),
      ...(body.startsAt !== undefined ? { startsAt: body.startsAt ? new Date(body.startsAt) : null } : {}),
      ...(body.durationMin !== undefined ? { durationMin: intOrNull(body.durationMin) } : {}),
      ...(body.timezone !== undefined ? { timezone: asString(body.timezone) } : {}),
      ...(body.liveUrl !== undefined ? { liveUrl: asString(body.liveUrl) } : {}),
      ...(body.replayUrl !== undefined ? { replayUrl: asString(body.replayUrl) } : {}),
      ...(body.capacity !== undefined ? { capacity: intOrNull(body.capacity) } : {}),
      ...(body.targetRole !== undefined ? { targetRole: body.targetRole ?? null } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: asString(body.imageUrl) } : {}),

      // Training fields
      ...(body.trainingFormat !== undefined ? { trainingFormat: body.trainingFormat } : {}),
      ...(body.publishStatus !== undefined ? { publishStatus: body.publishStatus } : {}),
      ...(body.level !== undefined ? { level: asString(body.level) } : {}),
      ...(body.videoUrl !== undefined ? { videoUrl: asString(body.videoUrl) } : {}),
      ...(objectives !== undefined
        ? { objectivesJson: objectives.length ? objectives : Prisma.DbNull }
        : {}),
      ...(resources !== undefined
        ? { resourcesJson: resources.length ? resources : Prisma.DbNull }
        : {}),

      // Monetization
      ...(body.isPaid !== undefined ? { isPaid: body.isPaid === true } : {}),
      ...(body.priceCents !== undefined ? { priceCents: nextIsPaid ? nextPriceCents : null } : {}),
      ...(body.currency !== undefined ? { currency: asString(body.currency) ?? "cad" } : {}),
      ...(body.stripePriceId !== undefined ? { stripePriceId: asString(body.stripePriceId) } : {}),
    },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      language: true,
      eventStatus: true,
      eventType: true,
      startsAt: true,
      durationMin: true,
      timezone: true,
      liveUrl: true,
      replayUrl: true,
      capacity: true,
      imageUrl: true,
      publishStatus: true,
      trainingFormat: true,
      level: true,
      videoUrl: true,
      objectivesJson: true,
      resourcesJson: true,
      isPaid: true,
      priceCents: true,
      currency: true,
      stripePriceId: true,
      targetRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const enrollmentsCount = await prisma.enrollment.count({ where: { contentId } });

  return NextResponse.json({
    ok: true,
    item: {
      ...updated,
      startsAt: updated.startsAt ? updated.startsAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      enrollmentsCount,
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { contentId } = await params;

  const item = await prisma.contentItem.findUnique({ where: { id: contentId }, select: { ownerId: true } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (auth.viewer.accountType !== "ADMIN" && auth.viewer.id !== item.ownerId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  await prisma.contentItem.delete({ where: { id: contentId } });
  return NextResponse.json({ ok: true });
}
