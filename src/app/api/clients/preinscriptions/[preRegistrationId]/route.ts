import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function objectiveLabel(value: string | null) {
  switch (value) {
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
      return "—";
  }
}

function budgetMinMax(budgetRange: string | null): { budgetMin: number | null; budgetMax: number | null } {
  switch (budgetRange) {
    case "MOINS_3000":
      return { budgetMin: 0, budgetMax: 3000 };
    case "ENTRE_3000_7000":
      return { budgetMin: 3000, budgetMax: 7000 };
    case "ENTRE_7000_15000":
      return { budgetMin: 7000, budgetMax: 15000 };
    case "PLUS_15000":
      return { budgetMin: 15000, budgetMax: null };
    case "JE_NE_SAIS_PAS":
    default:
      return { budgetMin: null, budgetMax: null };
  }
}

type UpdateReviewPayload = {
  status?: "NEW" | "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "NEEDS_INFO";
  feasibility?: "LOW" | "MEDIUM" | "HIGH" | null;
  recommendedTrack?: string | null;
  internalNotes?: string | null;
  assignedProId?: string | null;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ preRegistrationId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { preRegistrationId } = await context.params;

  const pre = await prisma.preRegistration.findUnique({
    where: { id: preRegistrationId },
    select: {
      id: true,
      createdAt: true,
      status: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      mainObjective: true,
      budgetRange: true,
      constraintsJson: true,
      constraintsOther: true,
      message: true,
      review: {
        select: {
          id: true,
          status: true,
          feasibility: true,
          recommendedTrack: true,
          internalNotes: true,
          assignedProId: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!pre) {
    return NextResponse.json({ error: "Préinscription introuvable." }, { status: 404 });
  }

  const constraints = jsonStringArray(pre.constraintsJson);
  const other = pre.constraintsOther?.trim();
  const allConstraints = other ? [...constraints, other] : constraints;
  const { budgetMin, budgetMax } = budgetMinMax(pre.budgetRange);

  return NextResponse.json({
    viewer: {
      id: auth.viewer.id,
      accountType: auth.viewer.accountType,
      isCertified: auth.viewer.isCertified,
    },
    item: {
      id: pre.id,
      createdAt: pre.createdAt.toISOString(),
      status: pre.status,
      firstName: pre.firstName ?? "",
      lastName: pre.lastName ?? "",
      email: pre.email ?? "",
      phone: pre.phone ?? null,
      objective: objectiveLabel(pre.mainObjective),
      desiredStart: null as string | null,
      budgetMin,
      budgetMax,
      constraints: allConstraints,
      notes: pre.message ?? null,
      review: pre.review
        ? {
            id: pre.review.id,
            status: pre.review.status,
            feasibility: pre.review.feasibility,
            recommendedTrack: pre.review.recommendedTrack,
            internalNotes: pre.review.internalNotes,
            assignedProId: pre.review.assignedProId,
            updatedAt: pre.review.updatedAt.toISOString(),
          }
        : null,
    },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ preRegistrationId: string }> },
) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { preRegistrationId } = await context.params;

  const pre = await prisma.preRegistration.findUnique({
    where: { id: preRegistrationId },
    select: { id: true, userId: true },
  });

  if (!pre) {
    return NextResponse.json({ error: "Préinscription introuvable." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as UpdateReviewPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const isAdmin = auth.viewer.accountType === "ADMIN";

  const assignedProId = isAdmin ? body.assignedProId ?? undefined : auth.viewer.id;

  const review = await prisma.preRegistrationReview.upsert({
    where: { preRegistrationId },
    update: {
      status: body.status,
      feasibility: body.feasibility ?? undefined,
      recommendedTrack:
        body.recommendedTrack === null ? null : (body.recommendedTrack ?? undefined),
      internalNotes: body.internalNotes === null ? null : (body.internalNotes ?? undefined),
      assignedProId: assignedProId === null ? null : assignedProId,
    },
    create: {
      preRegistrationId,
      status: body.status ?? "NEW",
      feasibility: body.feasibility ?? null,
      recommendedTrack: body.recommendedTrack ?? null,
      internalNotes: body.internalNotes ?? null,
      assignedProId: assignedProId ?? null,
    },
  });

  return NextResponse.json({ review });
}
