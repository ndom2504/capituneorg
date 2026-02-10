import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdminActionViewer } from "@/app/api/admin/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UsersAction = "SUSPEND" | "REACTIVATE" | "DELETE" | "FORCE_LOGOUT" | "ADD_NOTE";

type Body = {
  action: UsersAction;
  reason?: string;
  noteBody?: string;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  const { userId } = await ctx.params;

  if (!userId) {
    return NextResponse.json({ error: "userId requis." }, { status: 400 });
  }

  if (userId === auth.viewer.id) {
    // On évite de se tirer dans le pied (suspension / réactivation)
    // Force logout reste possible, mais géré en dessous.
  }

  let body: Body | null = null;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = null;
  }

  if (!body) {
    return NextResponse.json({ error: "Body requis." }, { status: 400 });
  }

  if (
    body.action !== "SUSPEND" &&
    body.action !== "REACTIVATE" &&
    body.action !== "DELETE" &&
    body.action !== "FORCE_LOGOUT" &&
    body.action !== "ADD_NOTE"
  ) {
    return NextResponse.json({ error: "action invalide." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      accountType: true,
      adminRole: true,
      accountStatus: true,
      suspendedAt: true,
      deletedAt: true,
      sessionInvalidBefore: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  const now = new Date();

  if (body.action === "ADD_NOTE") {
    const noteBody = (body.noteBody ?? "").trim();
    if (!noteBody) {
      return NextResponse.json({ error: "noteBody requis." }, { status: 400 });
    }
    if (noteBody.length > 2000) {
      return NextResponse.json(
        { error: "Note trop longue (max 2000 caractères)." },
        { status: 400 },
      );
    }

    const note = await prisma.userAdminNote.create({
      data: {
        userId: existing.id,
        adminId: auth.viewer.id,
        body: noteBody,
      },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: "ADD_ADMIN_NOTE",
        objectType: "User",
        objectId: existing.id,
        beforeJson: existing,
        afterJson: { noteId: note.id },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "FORCE_LOGOUT") {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { sessionInvalidBefore: now },
      select: {
        id: true,
        accountStatus: true,
        suspendedAt: true,
        sessionInvalidBefore: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: "FORCE_LOGOUT",
        objectType: "User",
        objectId: existing.id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "SUSPEND") {
    if (existing.id === auth.viewer.id) {
      return NextResponse.json(
        { error: "Impossible de suspendre votre propre compte." },
        { status: 403 },
      );
    }

    const reason = (body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "Motif requis." }, { status: 400 });
    }
    if (reason.length > 1000) {
      return NextResponse.json(
        { error: "Motif trop long (max 1000 caractères)." },
        { status: 400 },
      );
    }

    if (existing.accountStatus === "DELETED") {
      return NextResponse.json(
        { error: "Compte supprimé: suspension impossible." },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        accountStatus: "SUSPENDED",
        suspendedAt: now,
        sessionInvalidBefore: now,
      },
      select: {
        id: true,
        accountStatus: true,
        suspendedAt: true,
        sessionInvalidBefore: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: "SUSPEND_USER",
        objectType: "User",
        objectId: existing.id,
        beforeJson: { ...existing, reason },
        afterJson: updated,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "DELETE") {
    if (existing.id === auth.viewer.id) {
      return NextResponse.json(
        { error: "Impossible de bannir votre propre compte." },
        { status: 403 },
      );
    }

    const reason = (body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "Motif requis pour bannir un compte." }, { status: 400 });
    }
    if (reason.length > 1000) {
      return NextResponse.json(
        { error: "Motif trop long (max 1000 caractères)." },
        { status: 400 },
      );
    }

    if (existing.accountStatus === "DELETED") {
      return NextResponse.json(
        { error: "Compte déjà banni/supprimé." },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        accountStatus: "DELETED",
        deletedAt: now,
        sessionInvalidBefore: now,
      },
      select: {
        id: true,
        accountStatus: true,
        deletedAt: true,
        sessionInvalidBefore: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: auth.viewer.id,
        action: "DELETE_USER",
        objectType: "User",
        objectId: existing.id,
        beforeJson: { ...existing, reason },
        afterJson: updated,
      },
    });

    return NextResponse.json({ ok: true });
  }

  // REACTIVATE
  if (existing.id === auth.viewer.id) {
    return NextResponse.json(
      { error: "Impossible de réactiver votre propre compte (action inutile)." },
      { status: 403 },
    );
  }

  if (existing.accountStatus === "DELETED") {
    return NextResponse.json(
      { error: "Compte supprimé: réactivation impossible." },
      { status: 409 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      accountStatus: "ACTIVE",
      suspendedAt: null,
    },
    select: {
      id: true,
      accountStatus: true,
      suspendedAt: true,
      sessionInvalidBefore: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: auth.viewer.id,
      action: "REACTIVATE_USER",
      objectType: "User",
      objectId: existing.id,
      beforeJson: existing,
      afterJson: updated,
    },
  });

  return NextResponse.json({ ok: true });
}
