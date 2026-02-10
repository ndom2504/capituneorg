import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  idToken?: string;
  accountType?: "USER" | "PROFESSIONAL";
};

function splitName(displayName: string | null | undefined) {
  const name = (displayName ?? "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.idToken) {
    return NextResponse.json({ error: "idToken requis." }, { status: 400 });
  }

  const desiredAccountType =
    body.accountType === "PROFESSIONAL" || body.accountType === "USER" ? body.accountType : null;

  let decoded: { email?: string; name?: string; picture?: string };
  try {
    const auth = getFirebaseAdminAuth();
    decoded = await auth.verifyIdToken(body.idToken);
  } catch {
    return NextResponse.json({ error: "Token LinkedIn invalide." }, { status: 401 });
  }

  const email = (decoded.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email LinkedIn indisponible." }, { status: 400 });
  }

  const { firstName, lastName } = splitName(decoded.name);
  const fullName = `${firstName} ${lastName}`.trim() || "Utilisateur";

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, accountType: true, roleLocked: true, accountStatus: true },
  });

  if (existing?.accountStatus === "SUSPENDED") {
    return NextResponse.json(
      { error: "Compte suspendu. Contactez le support si besoin.", code: "ACCOUNT_SUSPENDED" },
      { status: 403 },
    );
  }

  if (existing?.accountStatus === "DELETED") {
    return NextResponse.json(
      { error: "Compte supprimé. Contactez le support si besoin.", code: "ACCOUNT_DELETED" },
      { status: 403 },
    );
  }

  const isNewUser = !existing;

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName,
          avatarUrl: decoded.picture ?? undefined,
          // passwordHash reste null: on force LinkedIn pour ce compte sauf ajout ultérieur
        },
        select: { id: true, accountType: true },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash: null,
          fullName,
          avatarUrl: decoded.picture ?? null,
          coverUrl: null,
          accountType: desiredAccountType ?? "USER",
          roleLocked: true,
          isCertified: false,
        },
        select: { id: true, accountType: true },
      });

  // Préinscription uniquement pour les demandeurs
  let preRegistrationStatus: "DRAFT" | "SUBMITTED" | null = null;
  if (user.accountType === "USER") {
    const pre = await prisma.preRegistration.upsert({
      where: { userId: user.id },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email,
      },
      create: {
        userId: user.id,
        status: "DRAFT",
        firstName: firstName || null,
        lastName: lastName || null,
        email,
      },
      select: { status: true },
    });
    preRegistrationStatus = pre.status;
  }

  // Pour les professionnels, vérifier s'ils ont déjà un profil marketplace
  let hasMarketplaceProfile = false;
  if (user.accountType === "PROFESSIONAL" || user.accountType === "ADMIN") {
    const profile = await prisma.marketplaceProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    hasMarketplaceProfile = !!profile;
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({
    ok: true,
    accountType: user.accountType,
    isNewUser,
    hasMarketplaceProfile,
    preRegistrationStatus,
  });
  setSessionCookie(res, token);
  return res;
}
