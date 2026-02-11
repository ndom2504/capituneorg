"use server";

import { revalidatePath } from "next/cache";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

type MainObjective = "ETUDIER" | "TRAVAILLER" | "ENTREPRENDRE" | "FAMILLE" | "EXPLORER";

const MAIN_OBJECTIVES: MainObjective[] = [
  "ETUDIER",
  "TRAVAILLER",
  "ENTREPRENDRE",
  "FAMILLE",
  "EXPLORER",
];

function normalizeMainObjective(value: FormDataEntryValue | null): MainObjective | null {
  if (typeof value !== "string") return null;
  return MAIN_OBJECTIVES.includes(value as MainObjective) ? (value as MainObjective) : null;
}

function normalizeMessage(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function submitPreRegistration(formData: FormData) {
  const viewer = await getAppViewer();
  if (!viewer) {
    throw new Error("Unauthorized");
  }

  const mainObjective = normalizeMainObjective(formData.get("mainObjective"));
  const message = normalizeMessage(formData.get("message"));

  const data: { mainObjective?: MainObjective; message?: string | null } = {};
  if (mainObjective) data.mainObjective = mainObjective;
  if (message !== null) data.message = message;

  const existing = await prisma.preRegistration.findUnique({
    where: { userId: viewer.id },
    select: { id: true },
  });

  if (!existing) {
    await prisma.preRegistration.create({
      data: {
        userId: viewer.id,
        status: "DRAFT",
        ...data,
      },
    });
  } else if (Object.keys(data).length > 0) {
    await prisma.preRegistration.update({
      where: { userId: viewer.id },
      data,
    });
  }

  revalidatePath("/mon-dossier");
  return { ok: true };
}
