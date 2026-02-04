import { NextResponse } from "next/server";

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

export async function GET() {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const items = await prisma.preRegistration.findMany({
    where: { status: "SUBMITTED" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
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
          updatedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const dto = items.map((pre) => {
    const constraints = jsonStringArray(pre.constraintsJson);
    const other = pre.constraintsOther?.trim();
    const allConstraints = other ? [...constraints, other] : constraints;
    const { budgetMin, budgetMax } = budgetMinMax(pre.budgetRange);
    return {
      id: pre.id,
      createdAt: pre.createdAt.toISOString(),
      status: pre.status,
      firstName: pre.firstName ?? "",
      lastName: pre.lastName ?? "",
      email: pre.email ?? "",
      objective: objectiveLabel(pre.mainObjective),
      desiredStart: null as string | null,
      budgetMin,
      budgetMax,
      constraints: allConstraints,
      review: pre.review
        ? {
            id: pre.review.id,
            status: pre.review.status,
            updatedAt: pre.review.updatedAt.toISOString(),
          }
        : null,
    };
  });

  return NextResponse.json({ items: dto });
}
