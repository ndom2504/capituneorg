import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEN = 2;
const MAX_LEN = 60;

function normalizeName(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export async function PATCH(req: Request) {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";

  const viewer = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { fullName?: unknown }
    | null;

  const raw = String(body?.fullName ?? "");
  const fullName = normalizeName(raw);

  if (fullName.length < MIN_LEN) {
    return NextResponse.json(
      { error: `Nom trop court (min ${MIN_LEN} caractères).` },
      { status: 400 },
    );
  }

  if (fullName.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Nom trop long (max ${MAX_LEN} caractères).` },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: viewer.id },
    data: { fullName },
    select: { fullName: true },
  });

  return NextResponse.json({ fullName: updated.fullName });
}
