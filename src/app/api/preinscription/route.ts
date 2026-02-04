import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { isNeedId, type NeedId } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveMode = "draft" | "submit";

type PreinscriptionPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  language?: "FRANCAIS" | "ANGLAIS" | "AUTRE";

  countryOfResidence?: string;
  city?: string;
  nationality?: string;
  residenceSituation?: "PAYS_ORIGINE" | "ETRANGER_ETUDES_TRAVAIL" | "TEMPORAIRE";

  mainObjective?: "ETUDIER" | "TRAVAILLER" | "ENTREPRENDRE" | "FAMILLE" | "EXPLORER";
  needs?: string[];

  professionalSituation?: "ETUDIANT" | "SALARIE" | "ENTREPRENEUR" | "SANS_EMPLOI";
  domain?: "TECH" | "SANTE" | "COMMERCE_GESTION" | "INGENIERIE" | "TECHNIQUE" | "AUTRE";
  educationLevel?: "SECONDAIRE" | "BAC_LICENCE" | "MASTER" | "DOCTORAT" | "AUTRE";
  experienceRange?: "ZERO_UN" | "DEUX_QUATRE" | "CINQ_PLUS";

  budgetRange?:
    | "MOINS_3000"
    | "ENTRE_3000_7000"
    | "ENTRE_7000_15000"
    | "PLUS_15000"
    | "JE_NE_SAIS_PAS";

  constraints?: string[];
  constraintsOther?: string;

  message?: string;

  disclaimerAccepted?: boolean;
  contactAccepted?: boolean;
};

async function getViewer() {
  // Priorité à la session réelle
  const sessionViewer = await getAppViewer();
  if (sessionViewer) return { id: sessionViewer.id, email: sessionViewer.email, accountType: sessionViewer.accountType };

  // Fallback dev (historique)
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, accountType: true },
  });
}

function legacyNeedToNeedId(value: string): NeedId | null {
  const v = value.trim();
  if (!v) return null;
  if (isNeedId(v)) return v;

  const up = v.toUpperCase();
  const map: Record<string, NeedId> = {
    ORIENTATION: "need.orientation",
    EVALUATION: "need.orientation",
    ETUDES: "need.etudes",
    TRAVAIL: "need.travail",
    ENTREPRENEUR: "need.entrepreneuriat",
    ENTREPRENEURIAT: "need.entrepreneuriat",
    DOCUMENTS: "need.documents",
    BUDGET: "need.budget",
    IMMIGRATION: "need.immigration",
    FAMILLE: "need.famille",
    INTEGRATION: "need.integration",
    INSTALLATION: "need.integration",
    FORMATION: "need.formation",
    FORMATIONS: "need.formation",
    PROFESSIONNEL: "need.travail",
  };
  return map[up] ?? null;
}

function normalizeNeedsInput(value: unknown): NeedId[] {
  // Formats supportés:
  // - tableau: ["need.orientation", ...] (nouveau)
  // - tableau legacy: ["ORIENTATION", "EVALUATION", ...]
  // - objet legacy: { primaryNeed: "ORIENTATION" }
  // - objet: { needs: [...] }

  let raw: unknown = value;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.needs)) raw = obj.needs;
    else if (typeof obj.primaryNeed === "string") raw = [obj.primaryNeed];
  }

  const list = Array.isArray(raw) ? raw : [];
  const out: NeedId[] = [];
  for (const it of list) {
    if (typeof it !== "string") continue;
    const id = legacyNeedToNeedId(it);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

function required(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function validateSubmit(payload: PreinscriptionPayload) {
  const errors: Record<string, string> = {};

  if (!required(payload.firstName)) errors.firstName = "Prénom requis";
  if (!required(payload.lastName)) errors.lastName = "Nom requis";
  if (!required(payload.email)) errors.email = "Email requis";
  if (!required(payload.language)) errors.language = "Langue requise";

  if (!required(payload.countryOfResidence)) errors.countryOfResidence = "Pays requis";
  if (!required(payload.nationality)) errors.nationality = "Nationalité requise";
  if (!required(payload.residenceSituation)) errors.residenceSituation = "Situation requise";

  if (!required(payload.mainObjective)) errors.mainObjective = "Objectif requis";

  if (!payload.disclaimerAccepted) {
    errors.disclaimerAccepted =
      "Vous devez confirmer que la préinscription n’est pas une demande officielle.";
  }
  if (!payload.contactAccepted) {
    errors.contactAccepted = "Vous devez accepter d’être contacté.";
  }

  if (payload.message && payload.message.length > 500) {
    errors.message = "Message trop long (max 500 caractères)";
  }

  return errors;
}

function programFromObjective(obj?: PreinscriptionPayload["mainObjective"]) {
  switch (obj) {
    case "ETUDIER":
      return "Étudier";
    case "TRAVAILLER":
      return "Travailler";
    case "ENTREPRENDRE":
      return "Entreprendre / Investir";
    case "FAMILLE":
      return "Famille";
    case "EXPLORER":
      return "Explorer mes options";
    default:
      return "Préinscription";
  }
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Espace réservé aux demandeurs." },
      { status: 403 },
    );
  }

  const pre = await prisma.preRegistration.findUnique({
    where: { userId: viewer.id },
    select: {
      status: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      language: true,
      countryOfResidence: true,
      city: true,
      nationality: true,
      residenceSituation: true,
      mainObjective: true,
      needsJson: true,
      professionalSituation: true,
      domain: true,
      educationLevel: true,
      experienceRange: true,
      budgetRange: true,
      constraintsJson: true,
      constraintsOther: true,
      message: true,
      disclaimerAccepted: true,
      contactAccepted: true,
      updatedAt: true,
    },
  });

  if (!pre) return NextResponse.json({ preRegistration: null });

  const needs = normalizeNeedsInput(pre.needsJson);

  return NextResponse.json({
    preRegistration: {
      status: pre.status,
      firstName: pre.firstName,
      lastName: pre.lastName,
      email: pre.email,
      phone: pre.phone,
      language: pre.language,
      countryOfResidence: pre.countryOfResidence,
      city: pre.city,
      nationality: pre.nationality,
      residenceSituation: pre.residenceSituation,
      mainObjective: pre.mainObjective,
      needs,
      professionalSituation: pre.professionalSituation,
      domain: pre.domain,
      educationLevel: pre.educationLevel,
      experienceRange: pre.experienceRange,
      budgetRange: pre.budgetRange,
      constraints: jsonStringArray(pre.constraintsJson),
      constraintsOther: pre.constraintsOther,
      message: pre.message,
      disclaimerAccepted: pre.disclaimerAccepted,
      contactAccepted: pre.contactAccepted,
      updatedAt: pre.updatedAt,
    },
  });
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Espace réservé aux demandeurs." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { mode?: SaveMode; payload?: PreinscriptionPayload }
    | null;

  const mode: SaveMode = body?.mode === "submit" ? "submit" : "draft";
  const payload = body?.payload ?? {};

  if (mode === "submit") {
    const errors = validateSubmit(payload);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation", fieldErrors: errors }, { status: 400 });
    }
  }

  const data = {
    status: mode === "submit" ? "SUBMITTED" : "DRAFT",

    firstName: payload.firstName?.trim() || null,
    lastName: payload.lastName?.trim() || null,
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    language: payload.language ?? null,

    countryOfResidence: payload.countryOfResidence?.trim() || null,
    city: payload.city?.trim() || null,
    nationality: payload.nationality?.trim() || null,
    residenceSituation: payload.residenceSituation ?? null,

    mainObjective: payload.mainObjective ?? null,
    needsJson: normalizeNeedsInput(payload.needs),

    professionalSituation: payload.professionalSituation ?? null,
    domain: payload.domain ?? null,
    educationLevel: payload.educationLevel ?? null,
    experienceRange: payload.experienceRange ?? null,

    budgetRange: payload.budgetRange ?? null,
    constraintsJson: payload.constraints ?? [],
    constraintsOther: payload.constraintsOther?.trim() || null,

    message: payload.message?.trim() || null,

    disclaimerAccepted: !!payload.disclaimerAccepted,
    contactAccepted: !!payload.contactAccepted,
  } as const;

  const pre = await prisma.preRegistration.upsert({
    where: { userId: viewer.id },
    create: { userId: viewer.id, ...data },
    update: data,
    select: { status: true, updatedAt: true },
  });

  if (mode === "submit") {
    const existing = await prisma.dossier.findFirst({
      where: { userId: viewer.id, status: "PREINSCRIPTION" },
      select: { id: true },
    });

    if (!existing) {
      await prisma.dossier.create({
        data: {
          userId: viewer.id,
          program: programFromObjective(payload.mainObjective),
          status: "PREINSCRIPTION",
        },
      });
    }
  }

  return NextResponse.json({ ok: true, status: pre.status, updatedAt: pre.updatedAt.toISOString() });
}
