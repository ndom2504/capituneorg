import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateMeetingPayload = {
  preRegistrationId?: string;
  clientId?: string;
  clientEmail?: string;
  title?: string;
  type?: "DISCOVERY_CALL" | "ORIENTATION" | "DOSSIER_FOLLOWUP" | "OTHER";
  startsAt?: string; // ISO
  durationMin?: number;
  locationUrl?: string;
  notesInternal?: string;
};

export async function GET(req: NextRequest) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "upcoming";

  const isAdmin = auth.viewer.accountType === "ADMIN";
  const where: Prisma.MeetingWhereInput = {
    ...(isAdmin ? {} : { proId: auth.viewer.id }),
  };

  const now = new Date();
  if (scope === "past") {
    where.startsAt = { lt: now };
  } else {
    where.startsAt = { gte: now };
  }

  const items = await prisma.meeting.findMany({
    where,
    orderBy: { startsAt: scope === "past" ? "desc" : "asc" },
    include: {
      client: { select: { id: true, fullName: true, email: true } },
      pro: { select: { id: true, fullName: true, email: true } },
      preRegistration: { select: { id: true } },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as CreateMeetingPayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "startsAt requis (ISO)." }, { status: 400 });
  }

  let clientId = body.clientId ?? null;
  const preRegistrationId = body.preRegistrationId ?? null;

  if (!clientId && body.clientEmail) {
    const user = await prisma.user.findUnique({
      where: { email: body.clientEmail },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Client introuvable (email)." }, { status: 404 });
    }
    clientId = user.id;
  }

  if (!clientId && preRegistrationId) {
    const pre = await prisma.preRegistration.findUnique({
      where: { id: preRegistrationId },
      select: { userId: true },
    });
    if (!pre) {
      return NextResponse.json({ error: "Préinscription introuvable." }, { status: 404 });
    }
    clientId = pre.userId;
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId ou preRegistrationId requis." }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      clientId,
      proId: auth.viewer.id,
      preRegistrationId,
      title: (body.title ?? "Rendez-vous").slice(0, 120),
      type: body.type ?? "OTHER",
      startsAt,
      durationMin: Math.max(10, Math.min(180, Math.trunc(body.durationMin ?? 30))),
      locationUrl: body.locationUrl?.slice(0, 500) ?? null,
      notesInternal: body.notesInternal?.slice(0, 2000) ?? null,
    },
  });

  return NextResponse.json({ meeting });
}
