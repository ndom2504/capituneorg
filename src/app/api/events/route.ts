import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Meta = {
  bannerUrl?: string | null;
  priceCents?: number | null;
  currency?: string | null;
};

function parseMeta(meta: string | null): Meta {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta) as Meta;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function GET() {
  const flags = await getFeatureFlagsFromDb();
  if (flags.events === false) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  const isProOrAdmin = viewer?.accountType === "PROFESSIONAL" || viewer?.accountType === "ADMIN";

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { status: "PUBLISHED" },
        { createdBy: viewer?.id || "" }, // Creator sees their own drafts
      ],
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  const payload = events
    .filter((ev) => {
      // Pour les pros/admins, on montre tout (leurs brouillons + tout le reste publié)
      if (isProOrAdmin) return true;
      
      // Pour les demandeurs :
      // 1. Si c'est un REPLAY (formation), on montre toujours
      if (ev.format === "REPLAY") return true;
      
      // 2. Si c'est un LIVE, on limite aux événements à venir ou très récents
      if (!ev.startsAt) return true;
      return ev.startsAt >= new Date(Date.now() - 2 * 60 * 60 * 1000); // tolérance 2h
    })
    .map((ev) => {
      const meta = parseMeta(ev.objectives);
      return {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        description: ev.description,
        type: ev.type,
        theme: ev.theme,
        level: ev.level,
        format: ev.format,
        startsAt: ev.startsAt?.toISOString() ?? null,
        liveUrl: ev.liveUrl,
        bannerUrl: ev.bannerUrl || meta.bannerUrl || null, // Check both
        priceCents: meta.priceCents ?? null,
        currency: meta.currency ?? null,
        createdAt: ev.createdAt.toISOString(),
      };
    });

  return NextResponse.json({ events: payload });
}

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (flags.events === false) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer || (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    type?: string;
    theme?: string;
    level?: string;
    format?: string;
    startsAt?: string | null;
    liveUrl?: string | null;
    bannerUrl?: string | null;
    priceCents?: number | null;
    currency?: string | null;
  } | null;

  if (!body || !body.title || !body.description) {
    return NextResponse.json({ error: "Titre et description requis." }, { status: 400 });
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.startsAt && Number.isNaN(startsAt?.getTime())) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const meta: Meta = {
    bannerUrl: body.bannerUrl || null,
    priceCents: body.priceCents ?? null,
    currency: body.currency ?? null,
  };

  // Generate slug
  const slug =
    body.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") + "-" + randomUUID().slice(0, 8);

  const event = await prisma.event.create({
    data: {
      title: body.title,
      slug,
      description: body.description,
      type: (body.type as any) || "WEBINAIRE",
      theme: (body.theme as any) || "TRAVAIL",
      level: (body.level as any) || "DEBUTANT",
      format: (body.format as any) || "LIVE",
      mode: "ONLINE",
      status: "DRAFT",
      isPaid: false,
      startsAt,
      liveUrl: body.liveUrl || null,
      durationMin: null,
      createdBy: viewer.id,
    },
  });

  return NextResponse.json({ event: { ...event, startsAt: event.startsAt?.toISOString() ?? null } }, { status: 201 });
}
