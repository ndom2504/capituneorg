import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CASE_STATUSES = new Set(["PENDING", "ACCEPTED", "REJECTED", "IN_PROGRESS", "DONE"] as const);

type CaseStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "DONE";

const allowedTransitions: Record<CaseStatus, Set<CaseStatus>> = {
  PENDING: new Set(["ACCEPTED", "REJECTED"]),
  ACCEPTED: new Set(["IN_PROGRESS", "DONE"]),
  IN_PROGRESS: new Set(["DONE"]),
  REJECTED: new Set([]),
  DONE: new Set([]),
};

function isMessagingEnabled(flags: Record<string, unknown>) {
  return flags.messaging !== false;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  
  const flags = await getFeatureFlagsFromDb();
  if (!isMessagingEnabled(flags)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const nextStatus = (body?.status ?? "").toUpperCase();
  if (!CASE_STATUSES.has(nextStatus as CaseStatus)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, status: true, requesterId: true, professionalId: true },
  });

  if (!c) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });

  const isParticipant = viewer.id === c.requesterId || viewer.id === c.professionalId;
  const isAdmin = viewer.accountType === "ADMIN";
  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const currentStatus = c.status as CaseStatus;
  if (currentStatus === nextStatus) {
    return NextResponse.json({ status: currentStatus });
  }

  if (!isAdmin && !allowedTransitions[currentStatus].has(nextStatus as CaseStatus)) {
    return NextResponse.json({ error: "Transition non autorisée." }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id: c.id },
    data: { status: nextStatus as CaseStatus, lastActivityAt: new Date() },
    select: { status: true },
  });

  return NextResponse.json({ status: updated.status });
}
