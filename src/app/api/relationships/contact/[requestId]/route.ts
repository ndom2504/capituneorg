import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import { getViewer } from "../../_viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notificationRoleForAccountType(accountType: string) {
  return accountType === "USER" ? "DEMANDEUR" : "PRO";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { action?: unknown }
    | null;
  const action = String(body?.action ?? "").toUpperCase();
  if (action !== "ACCEPT" && action !== "REJECT") {
    return NextResponse.json(
      { error: "Action invalide (ACCEPT|REJECT)." },
      { status: 400 },
    );
  }

  const existing = await prisma.contactRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      toId: true,
      fromId: true,
      status: true,
      from: { select: { accountType: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (existing.toId !== viewer.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json({ ok: true });
  }

  await prisma.contactRequest.update({
    where: { id: requestId },
    data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
  });

  // V1 notifications: informer l'expéditeur (silencieux si indisponible)
  try {
    await prisma.notification.create({
      data: {
        userId: existing.fromId,
        role: notificationRoleForAccountType(existing.from.accountType),
        type: "CONTACT_REQUEST_UPDATED",
        title: action === "ACCEPT" ? "Demande de contact acceptée" : "Demande de contact refusée",
        message:
          action === "ACCEPT"
            ? "Votre demande a été acceptée."
            : "Votre demande a été refusée.",
        link: "/reseau-pro",
        priority: "INFO",
      },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
