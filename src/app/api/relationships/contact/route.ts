import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

import { canContact } from "../_rules";
import { getViewer } from "../_viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notificationRoleForAccountType(accountType: string) {
  return accountType === "USER" ? "DEMANDEUR" : "PRO";
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { targetUserId?: unknown; message?: unknown }
    | null;

  const targetUserId = String(body?.targetUserId ?? "");
  const message = String(body?.message ?? "").trim();

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Paramètre targetUserId manquant." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, accountType: true, isCertified: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const allowed = canContact(viewer, target);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.reason }, { status: 403 });
  }

  const existing = await prisma.contactRequest.findUnique({
    where: { fromId_toId: { fromId: viewer.id, toId: target.id } },
    select: { id: true, status: true },
  });

  if (existing) {
    return NextResponse.json({ requestId: existing.id, status: existing.status });
  }

  const created = await prisma.contactRequest.create({
    data: { fromId: viewer.id, toId: target.id, message: message || null },
    select: { id: true, status: true },
  });

  // V1 notifications: rendre la demande visible côté destinataire (silencieux si indisponible)
  try {
    await prisma.notification.create({
      data: {
        userId: target.id,
        role: notificationRoleForAccountType(target.accountType),
        type: "CONTACT_REQUEST_RECEIVED",
        title: "Nouvelle demande de contact",
        message: "Vous avez reçu une demande de contact. Cliquez pour répondre.",
        link: "/reseau-pro",
        priority: "IMPORTANT",
      },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ requestId: created.id, status: created.status });
}
