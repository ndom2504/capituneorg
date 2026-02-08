import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

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

type CreatePayload = {
  type?: "EVENT" | "TRAINING";

  title?: string;
  description?: string;
  language?: string;

  // Event
  eventType?: "LIVE" | "ATELIER" | "QA";
  startsAt?: string;
  durationMin?: number;
  timezone?: string;
  liveUrl?: string | null;
  capacity?: number | null;
  targetRole?: "ALL" | "DEMANDEUR" | "PRO";
  imageUrl?: string | null;

  // Training
  trainingFormat?: "VIDEO" | "RESOURCES" | "MIXED";
  level?: string | null;
  videoUrl?: string | null;
  objectives?: string[];
  resources?: string[];

  // Monetization
  isPaid?: boolean;
  priceCents?: number | null;
  currency?: string | null;
  stripePriceId?: string | null;

  // Publish
  publishStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  eventStatus?: "DRAFT" | "PUBLISHED" | "FULL" | "ENDED" | "CANCELLED";
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

export async function GET(req: NextRequest) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as "EVENT" | "TRAINING" | null;

  if (type !== "EVENT" && type !== "TRAINING") {
    return NextResponse.json({ error: "Paramètre 'type' requis (EVENT|TRAINING)." }, { status: 400 });
  }

  const items = await prisma.contentItem.findMany({
    where: { ownerId: auth.viewer.id, type },
    orderBy:
      type === "EVENT"
        ? [{ startsAt: "asc" }, { createdAt: "desc" }]
        : [{ updatedAt: "desc" }],
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
      isPaid: true,
      priceCents: true,
      currency: true,
      targetRole: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { enrollments: true } },
    },
  });

  const verification = await getProVerification(auth.viewer.id);

  return NextResponse.json({
    items: items.map((it: (typeof items)[number]) => ({
      ...it,
      startsAt: it.startsAt ? it.startsAt.toISOString() : null,
      createdAt: it.createdAt.toISOString(),
      updatedAt: it.updatedAt.toISOString(),
      enrollmentsCount: it._count.enrollments,
    })),
    viewer: {
      id: auth.viewer.id,
      fullName: auth.viewer.fullName,
      accountType: auth.viewer.accountType,
      isCertified: auth.viewer.isCertified,
      pro: verification,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as CreatePayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const type = body.type;
  if (type !== "EVENT" && type !== "TRAINING") {
    return NextResponse.json({ error: "Type requis (EVENT|TRAINING)." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const language = (body.language ?? "fr").trim().toLowerCase();

  if (!title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Description requise." }, { status: 400 });
  if (language !== "fr" && language !== "en") {
    return NextResponse.json({ error: "Langue invalide (fr|en)." }, { status: 400 });
  }

  const verification = await getProVerification(auth.viewer.id);

  const isPaid = body.isPaid === true;
  const priceCents = intOrNull(body.priceCents);
  const currency = asString(body.currency ?? null) ?? "cad";

  if (isPaid) {
    if (!priceCents || priceCents <= 0) {
      return NextResponse.json({ error: "Prix requis si payant." }, { status: 400 });
    }

    // Reco CAPITUNE: publication payante réservée aux pros vérifiés.
    const requestedPublic =
      (type === "EVENT" && body.eventStatus === "PUBLISHED") ||
      (type === "TRAINING" && body.publishStatus === "PUBLISHED");

    if (requestedPublic && !verification.isVerified) {
      return NextResponse.json(
        { error: "Publication payante réservée aux pros vérifiés." },
        { status: 403 },
      );
    }
  }

  if (type === "EVENT") {
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (!startsAt || Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Date/heure de début requise." }, { status: 400 });
    }

    const durationMin = intOrNull(body.durationMin);
    if (!durationMin || durationMin <= 0) {
      return NextResponse.json({ error: "Durée requise." }, { status: 400 });
    }

    const timezone = (body.timezone ?? "").trim();
    if (!timezone) {
      return NextResponse.json({ error: "Fuseau horaire requis." }, { status: 400 });
    }

    const eventType = body.eventType;
    if (eventType !== "LIVE" && eventType !== "ATELIER" && eventType !== "QA") {
      return NextResponse.json({ error: "Type d’événement requis." }, { status: 400 });
    }

    const liveUrl = asString(body.liveUrl ?? "") || null;

    const requestedStatus = body.eventStatus ?? "DRAFT";
    if (requestedStatus === "PUBLISHED" && isPaid && !verification.isVerified) {
      return NextResponse.json(
        { error: "Publication payante réservée aux pros vérifiés." },
        { status: 403 },
      );
    }

    const created = await prisma.contentItem.create({
      data: {
        type: "EVENT",
        ownerId: auth.viewer.id,
        title,
        description,
        language,
        eventStatus: requestedStatus,
        eventType,
        startsAt,
        durationMin,
        timezone,
        liveUrl,
        capacity: intOrNull(body.capacity),
        targetRole: body.targetRole ?? null,
        imageUrl: asString(body.imageUrl ?? "") || null,
        replayUrl: null,
        isPaid,
        priceCents: isPaid ? priceCents : null,
        currency,
        stripePriceId: asString(body.stripePriceId ?? "") || null,
      },
      select: { id: true, eventStatus: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, item: { ...created, updatedAt: created.updatedAt.toISOString() } });
  }

  // TRAINING
  const trainingFormat = body.trainingFormat;
  if (trainingFormat !== "VIDEO" && trainingFormat !== "RESOURCES" && trainingFormat !== "MIXED") {
    return NextResponse.json({ error: "Format requis (Vidéo/Ressources/Mixte)." }, { status: 400 });
  }

  const requestedStatus = body.publishStatus ?? "DRAFT";
  if (requestedStatus === "PUBLISHED" && isPaid && !verification.isVerified) {
    return NextResponse.json(
      { error: "Publication payante réservée aux pros vérifiés." },
      { status: 403 },
    );
  }

  const videoUrl = asString(body.videoUrl ?? "") || null;
  const objectives = Array.isArray(body.objectives) ? body.objectives.map((s) => s.trim()).filter(Boolean).slice(0, 30) : [];
  const resources = Array.isArray(body.resources) ? body.resources.map((s) => s.trim()).filter(Boolean).slice(0, 50) : [];

  if (trainingFormat === "VIDEO" && !videoUrl) {
    return NextResponse.json({ error: "Lien vidéo requis pour une formation vidéo." }, { status: 400 });
  }
  if (trainingFormat === "RESOURCES" && resources.length === 0) {
    return NextResponse.json({ error: "Au moins une ressource est requise." }, { status: 400 });
  }

  const created = await prisma.contentItem.create({
    data: {
      type: "TRAINING",
      ownerId: auth.viewer.id,
      title,
      description,
      language,
      publishStatus: requestedStatus,
      trainingFormat,
      level: asString(body.level ?? ""),
      videoUrl,
      objectivesJson: objectives.length ? objectives : undefined,
      resourcesJson: resources.length ? resources : undefined,
      isPaid,
      priceCents: isPaid ? priceCents : null,
      currency,
      stripePriceId: asString(body.stripePriceId ?? "") || null,
      targetRole: body.targetRole ?? null,
    },
    select: { id: true, publishStatus: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, item: { ...created, updatedAt: created.updatedAt.toISOString() } });
}
