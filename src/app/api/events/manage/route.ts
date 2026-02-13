import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/manage
 * List creator's events
 */
export async function GET() {
  const viewer = await getAppViewer();
  if (!viewer || (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Restriction: Vérifié/Certifié uniquement (ou Admin)
  if (viewer.accountType !== "ADMIN" && viewer.verificationStatus !== "VERIFIED" && viewer.verificationStatus !== "CERTIFIED") {
    return NextResponse.json({ error: "Accès réservé aux professionnels vérifiés (Identité)." }, { status: 403 });
  }

  const events = await prisma.event.findMany({
    where: { createdBy: viewer.id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      status: true,
      startsAt: true,
      bannerUrl: true,
      isPaid: true,
      price: true,
      durationMin: true,
      createdAt: true,
      _count: { select: { registrations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      price: e.price ? Number(e.price) : null,
    })),
  });
}

/**
 * POST /api/events/manage
 * Create new event
 */
export async function POST(req: NextRequest) {
  const viewer = await getAppViewer();
  if (!viewer || (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Restriction: Vérifié/Certifié uniquement (ou Admin)
  if (viewer.accountType !== "ADMIN" && viewer.verificationStatus !== "VERIFIED" && viewer.verificationStatus !== "CERTIFIED") {
    return NextResponse.json({ error: "Publication réservée aux professionnels vérifiés (Identité)." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    type?: string;
    mode?: string;
    startsAt?: string | null;
    durationMin?: number | null;
    liveUrl?: string | null;
    isPaid?: boolean;
    price?: number | null;
    bannerUrl?: string | null;
  } | null;

  if (!body || !body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Title and description required" }, { status: 400 });
  }

  // Generate slug from title
  const slug = body.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50) +
    "-" +
    Math.random().toString(36).substring(7);

  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description,
      type: (body.type as any) || "LIVE",
      theme: "TRAVAIL",
      level: "DEBUTANT",
      format: "LIVE",
      mode: (body.mode as any) || "ONLINE",
      status: "PUBLISHED", // Set to PUBLISHED by default as requested for automatic visibility
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      durationMin: body.durationMin ?? null,
      liveUrl: body.liveUrl || null,
      bannerUrl: body.bannerUrl || null,
      isPaid: body.isPaid ?? false,
      price: body.isPaid && body.price ? body.price : null,
      slug,
      createdBy: viewer.id,
    },
  });

  return NextResponse.json(
    {
      event: {
        ...event,
        price: event.price ? Number(event.price) : null,
        _count: { registrations: 0 },
      },
    },
    { status: 201 }
  );
}
