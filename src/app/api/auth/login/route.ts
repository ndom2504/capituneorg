import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const email = normalizeEmail(body.email ?? "");
  const password = String(body.password ?? "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, accountType: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true, accountType: user.accountType });
  setSessionCookie(res, token);
  return res;
}
