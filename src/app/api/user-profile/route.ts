import { NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LEN = 2;
const MAX_LEN = 60;

function normalizeName(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export async function PATCH(req: Request) {
  const viewer = await getAppViewer();

  if (!viewer) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { fullName?: unknown; email?: unknown }
    | null;

  const dataToUpdate: { fullName?: string; email?: string } = {};

  // Mise à jour du nom si fourni
  if (body?.fullName !== undefined) {
    const raw = String(body.fullName ?? "");
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

    dataToUpdate.fullName = fullName;
  }

  // Mise à jour de l'email si fourni
  if (body?.email !== undefined) {
    const raw = String(body.email ?? "");
    const email = normalizeEmail(raw);

    if (!email.includes("@") || email.length < 5) {
      return NextResponse.json(
        { error: "Adresse email invalide." },
        { status: 400 },
      );
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing && existing.id !== viewer.id) {
      return NextResponse.json(
        { error: "Cette adresse email est déjà utilisée." },
        { status: 400 },
      );
    }

    dataToUpdate.email = email;
  }

  // Si aucune donnée à mettre à jour
  if (Object.keys(dataToUpdate).length === 0) {
    return NextResponse.json(
      { error: "Aucune modification fournie." },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: viewer.id },
    data: dataToUpdate,
    select: { fullName: true, email: true },
  });

  return NextResponse.json({ fullName: updated.fullName, email: updated.email });
}
