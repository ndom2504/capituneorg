import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { isNeedId, type NeedId } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemandeurPayload = {
  accountType: "USER";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryOfResidence: string;
  language: "FRANCAIS" | "ANGLAIS" | "AUTRE";
  mainObjective?:
    | "ETUDIER"
    | "TRAVAILLER"
    | "ENTREPRENDRE"
    | "FAMILLE"
    | "EXPLORER";
  budgetRange?:
    | "MOINS_3000"
    | "ENTRE_3000_7000"
    | "ENTRE_7000_15000"
    | "PLUS_15000"
    | "JE_NE_SAIS_PAS";
  primaryNeed?:
    | "ORIENTATION"
    | "DOCUMENTS"
    | "PROFESSIONNEL"
    | "FORMATIONS";
};

type ProPayload = {
  accountType: "PROFESSIONAL";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  city: string;
  languages: string[];
  profession:
    | "IMMIGRATION_CONSULTANT"
    | "IMMIGRATION_LAWYER"
    | "ORIENTATION_COUNSELOR"
    | "ACADEMIC_COUNSELOR"
    | "EMPLOYMENT_COUNSELOR"
    | "CASE_MANAGER"
    | "CERTIFIED_TRANSLATOR"
    | "INTEGRATION_COACH"
    | "COMMUNITY_ORG";
  organization?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  licenseNumber?: string | null;
  licenseAuthority?: string | null;
  proofUrl: string;
  bioShort?: string | null;
  complianceAccepted: boolean;
  accuracyConfirmed: boolean;
};

type Payload = DemandeurPayload | ProPayload;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function clampText(value: string | null | undefined, max: number) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function stringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function primaryNeedToNeedId(value: DemandeurPayload["primaryNeed"] | undefined): NeedId | null {
  if (!value) return null;
  // Supporte aussi le format déjà normalisé si on l'envoie un jour
  if (isNeedId(value)) return value;

  switch (value) {
    case "ORIENTATION":
      return "need.orientation";
    case "DOCUMENTS":
      return "need.documents";
    case "PROFESSIONNEL":
      return "need.travail";
    case "FORMATIONS":
      return "need.formation";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const firstName = ("firstName" in body ? body.firstName : "").trim();
  const lastName = ("lastName" in body ? body.lastName : "").trim();
  const email = normalizeEmail(body.email ?? "");
  const password = String(body.password ?? "");

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe: 8 caractères minimum." }, { status: 400 });
  }

  // Règles spécifiques pro
  if (body.accountType === "PROFESSIONAL") {
    if (!body.country.trim() || !body.city.trim()) {
      return NextResponse.json({ error: "Pays et ville requis." }, { status: 400 });
    }
    if (!Array.isArray(body.languages) || !body.languages.length) {
      return NextResponse.json({ error: "Au moins une langue est requise." }, { status: 400 });
    }
    if (!body.profession) {
      return NextResponse.json({ error: "Métier requis." }, { status: 400 });
    }
    if (!body.proofUrl?.trim()) {
      return NextResponse.json({ error: "Justificatif requis (upload)." }, { status: 400 });
    }
    if (!body.complianceAccepted || !body.accuracyConfirmed) {
      return NextResponse.json(
        { error: "Vous devez accepter les engagements (conformité + exactitude)." },
        { status: 400 },
      );
    }
  }

  // Règles spécifiques demandeur
  if (body.accountType === "USER") {
    if (!body.countryOfResidence.trim()) {
      return NextResponse.json({ error: "Pays de résidence requis." }, { status: 400 });
    }
    if (!body.language) {
      return NextResponse.json({ error: "Langue requise." }, { status: 400 });
    }
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: `${firstName} ${lastName}`.trim(),
        accountType: body.accountType,
        roleLocked: true,
        isCertified: false,
      },
      select: { id: true, accountType: true },
    });

    if (body.accountType === "USER") {
      const primaryNeedId = primaryNeedToNeedId(body.primaryNeed);
      await prisma.preRegistration.upsert({
        where: { userId: user.id },
        update: {
          status: "DRAFT",
          firstName,
          lastName,
          email,
          language: body.language,
          countryOfResidence: body.countryOfResidence.trim(),
          mainObjective: body.mainObjective ?? null,
          budgetRange: body.budgetRange ?? null,
          needsJson: primaryNeedId ? ([primaryNeedId] as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        },
        create: {
          userId: user.id,
          status: "DRAFT",
          firstName,
          lastName,
          email,
          language: body.language,
          countryOfResidence: body.countryOfResidence.trim(),
          mainObjective: body.mainObjective ?? null,
          budgetRange: body.budgetRange ?? null,
          needsJson: primaryNeedId ? ([primaryNeedId] as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });
    }

    if (body.accountType === "PROFESSIONAL") {
      // Profil Marketplace en mode privé (DRAFT) / en vérification (isVerified=false)
      await prisma.marketplaceProfile.upsert({
        where: { userId: user.id },
        update: {
          status: "DRAFT",
          isVerified: false,
          profession: body.profession,
          organization: clampText(body.organization, 120),
          country: body.country.trim(),
          city: body.city.trim(),
          languagesJson: stringArray(body.languages, 12),
          proofUrl: clampText(body.proofUrl, 300),
          licenseNumber: clampText(body.licenseNumber, 80),
          licenseAuthority: clampText(body.licenseAuthority, 80),
          bioShort: clampText(body.bioShort, 300),
          // on stocke site/linkedin en texte tant qu'on n'a pas de champs dédiés
          bioLong: clampText(
            [
              body.websiteUrl ? `Site: ${body.websiteUrl}` : null,
              body.linkedinUrl ? `LinkedIn: ${body.linkedinUrl}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            1000,
          ),
        },
        create: {
          userId: user.id,
          status: "DRAFT",
          isVerified: false,
          profession: body.profession,
          organization: clampText(body.organization, 120),
          country: body.country.trim(),
          city: body.city.trim(),
          languagesJson: stringArray(body.languages, 12),
          proofUrl: clampText(body.proofUrl, 300),
          licenseNumber: clampText(body.licenseNumber, 80),
          licenseAuthority: clampText(body.licenseAuthority, 80),
          bioShort: clampText(body.bioShort, 300),
          bioLong: clampText(
            [
              body.websiteUrl ? `Site: ${body.websiteUrl}` : null,
              body.linkedinUrl ? `LinkedIn: ${body.linkedinUrl}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            1000,
          ),
        },
      });
    }

    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ ok: true, accountType: user.accountType });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "Inscription impossible." }, { status: 500 });
  }
}
