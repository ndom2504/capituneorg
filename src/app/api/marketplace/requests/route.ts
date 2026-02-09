import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notificationRoleForAccountType(accountType: string) {
  return accountType === "USER" ? "DEMANDEUR" : "PRO";
}

type CreateRequestPayload = {
  professionalId?: string;
  topic?:
    | "ETUDES"
    | "TRAVAIL"
    | "ENTREPRENEUR"
    | "DOCUMENTS"
    | "BUDGET"
    | "INSTALLATION"
    | "ORIENTATION"
    | "IMMIGRATION"
    | "FAMILLE"
    | "INTEGRATION"
    | "FORMATION"
    | "AUTRE";
  urgency?: "LOW" | "MEDIUM" | "HIGH";
  preferredTimeframe?: string;
  message?: string;
  cvUrl?: string;
  cvFileName?: string;
  attachPreRegistration?: boolean;
};

function clampText(value: string | undefined, max: number) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function isSafeUploadUrl(url: string | null) {
  if (!url) return false;
  return url.startsWith("/uploads/");
}

function labelMainObjective(v: string | null | undefined) {
  switch (v) {
    case "ETUDIER":
      return "Étudier";
    case "TRAVAILLER":
      return "Travailler";
    case "ENTREPRENDRE":
      return "Entreprendre";
    case "FAMILLE":
      return "Famille";
    case "EXPLORER":
      return "Explorer";
    default:
      return null;
  }
}

function labelResidenceSituation(v: string | null | undefined) {
  switch (v) {
    case "PAYS_ORIGINE":
      return "Dans mon pays d’origine";
    case "ETRANGER_ETUDES_TRAVAIL":
      return "À l’étranger (études / travail)";
    case "TEMPORAIRE":
      return "Séjour temporaire";
    default:
      return null;
  }
}

function labelBudgetRange(v: string | null | undefined) {
  switch (v) {
    case "MOINS_3000":
      return "Moins de 3 000";
    case "ENTRE_3000_7000":
      return "Entre 3 000 et 7 000";
    case "ENTRE_7000_15000":
      return "Entre 7 000 et 15 000";
    case "PLUS_15000":
      return "Plus de 15 000";
    case "JE_NE_SAIS_PAS":
      return "Je ne sais pas";
    default:
      return null;
  }
}

function summarizePreRegistration(p: {
  status: string;
  countryOfResidence: string | null;
  city: string | null;
  nationality: string | null;
  residenceSituation: string | null;
  mainObjective: string | null;
  budgetRange: string | null;
  constraintsOther: string | null;
  message: string | null;
}) {
  if (p.status !== "SUBMITTED") return null;

  const lines: string[] = [];
  lines.push("Formulaire joint (Mon parcours)");

  const objective = labelMainObjective(p.mainObjective);
  if (objective) lines.push(`- Objectif: ${objective}`);

  const situation = labelResidenceSituation(p.residenceSituation);
  if (situation) lines.push(`- Situation de résidence: ${situation}`);

  const locationBits = [p.city, p.countryOfResidence].filter(Boolean).join(", ");
  if (locationBits) lines.push(`- Lieu: ${locationBits}`);
  if (p.nationality) lines.push(`- Nationalité: ${p.nationality}`);

  const budget = labelBudgetRange(p.budgetRange);
  if (budget) lines.push(`- Budget: ${budget}`);

  if (p.constraintsOther) lines.push(`- Contraintes: ${p.constraintsOther}`);
  if (p.message) lines.push(`- Message: ${p.message}`);

  const raw = lines.join("\n");
  return raw.length > 1500 ? raw.slice(0, 1500) + "…" : raw;
}

export async function POST(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  if (viewer.accountType !== "USER") {
    return NextResponse.json(
      { error: "Seuls les demandeurs peuvent envoyer une demande." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as CreateRequestPayload | null;
  if (!body) return NextResponse.json({ error: "Payload invalide." }, { status: 400 });

  const professionalId = body.professionalId;
  if (!professionalId) {
    return NextResponse.json({ error: "professionalId requis." }, { status: 400 });
  }

  const profile = await prisma.marketplaceProfile.findFirst({
    where: {
      userId: professionalId,
      status: "PUBLISHED",
      user: { is: { accountType: "PROFESSIONAL", isCertified: true } },
    },
    select: { id: true, userId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  // Empêcher l'envoi de plusieurs demandes tant que la précédente n'est pas traitée.
  // "Traitée" ici = rejetée OU clôturée par le demandeur (closedByClientAt).
  const existingOpen = await prisma.marketplaceRequest.findFirst({
    where: {
      requesterId: viewer.id,
      professionalId: profile.userId,
      closedByClientAt: null,
      status: { in: ["PENDING", "NEEDS_INFO", "ACCEPTED"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  });

  if (existingOpen) {
    return NextResponse.json(
      {
        error:
          "Vous avez déjà une demande en cours avec ce professionnel. Attendez qu’elle soit traitée, ou clôturez la demande actuelle avant d’en envoyer une nouvelle.",
        existingRequest: {
          id: existingOpen.id,
          status: existingOpen.status,
          createdAt: existingOpen.createdAt.toISOString(),
        },
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const initialMessage = clampText(body.message, 500);
  const cvUrl = clampText(body.cvUrl, 300);
  const cvFileName = clampText(body.cvFileName, 120);

  if (cvUrl && !isSafeUploadUrl(cvUrl)) {
    return NextResponse.json(
      { error: "cvUrl invalide (doit pointer vers /uploads/...)." },
      { status: 400 },
    );
  }

  const createdMessages: Array<{
    senderRole: "REQUESTER";
    kind: "TEXT" | "FILE";
    body?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    createdAt: Date;
  }> = [];

  if (body.attachPreRegistration) {
    try {
      const pre = await prisma.preRegistration.findUnique({
        where: { userId: viewer.id },
        select: {
          status: true,
          countryOfResidence: true,
          city: true,
          nationality: true,
          residenceSituation: true,
          mainObjective: true,
          budgetRange: true,
          constraintsOther: true,
          message: true,
        },
      });
      const summary = pre ? summarizePreRegistration(pre) : null;
      if (summary) {
        createdMessages.push({
          senderRole: "REQUESTER",
          kind: "TEXT",
          body: summary,
          createdAt: now,
        });
      }
    } catch {
      // ignore
    }
  }

  if (cvUrl) {
    createdMessages.push({
      senderRole: "REQUESTER",
      kind: "FILE",
      fileUrl: cvUrl,
      fileName: cvFileName ?? "CV",
      createdAt: now,
    });
  }

  if (initialMessage) {
    createdMessages.push({
      senderRole: "REQUESTER",
      kind: "TEXT",
      body: initialMessage,
      createdAt: now,
    });
  }

  const request = await prisma.marketplaceRequest.create({
    data: {
      requesterId: viewer.id,
      professionalId: profile.userId,
      profileId: profile.id,
      topic: body.topic ?? null,
      urgency: body.urgency ?? null,
      preferredTimeframe: clampText(body.preferredTimeframe, 120),
      message: initialMessage,
      lastActivityAt: now,
      requesterLastReadAt: now,
      messages: createdMessages.length ? { create: createdMessages } : undefined,
    },
    select: { id: true, status: true, createdAt: true },
  });

  // V1 notifications: informer le professionnel (silencieux si indisponible)
  try {
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        role: notificationRoleForAccountType("PROFESSIONAL"),
        type: "MARKETPLACE_REQUEST_RECEIVED",
        title: "Nouvelle demande de rendez-vous",
        message: "Vous avez reçu une nouvelle demande Marketplace. Cliquez pour l’ouvrir.",
        link: `/clients/demandes/${request.id}`,
        priority: "IMPORTANT",
      },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    request: {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    },
  });
}
