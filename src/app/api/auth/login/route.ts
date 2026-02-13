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
    select: { id: true, passwordHash: true, accountType: true, accountStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Identifiants invalides.", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  if (user.accountStatus === "SUSPENDED") {
    return NextResponse.json(
      { error: "Compte suspendu. Contactez le support si besoin.", code: "ACCOUNT_SUSPENDED" },
      { status: 403 },
    );
  }

  if (user.accountStatus === "DELETED") {
    return NextResponse.json(
      { error: "Compte supprimé. Contactez le support si besoin.", code: "ACCOUNT_DELETED" },
      { status: 403 },
    );
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      {
        error: "Ce compte n’a pas de mot de passe (connexion via Google/LinkedIn). Utilisez la connexion Google/LinkedIn.",
        code: "PASSWORD_NOT_SET",
      },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides.", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  let preRegistrationStatus: "DRAFT" | "SUBMITTED" | null = null;
  if (user.accountType === "USER") {
    const pre = await prisma.preRegistration.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });
    preRegistrationStatus = pre?.status ?? null;
  }

  // Pour les professionnels, vérifier s'ils ont déjà un profil marketplace
  let hasMarketplaceProfile = false;
  if (user.accountType === "PROFESSIONAL" || user.accountType === "ADMIN") {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    hasMarketplaceProfile = !!profile;
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ 
    ok: true, 
    accountType: user.accountType,
    hasMarketplaceProfile,
    preRegistrationStatus,
  });
  setSessionCookie(res, token);
  return res;
}
