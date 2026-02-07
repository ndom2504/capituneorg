import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const dynamic = "force-dynamic";

async function getViewer() {
  const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { postId } = await params;

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as null | { content?: string };
  const content = normalizeText(String(body?.content ?? ""));

  const existing = await prisma.userPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true, mediaUrl: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  if (existing.userId !== viewer.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez modifier que vos publications." },
      { status: 403 },
    );
  }

  if (!content && !existing.mediaUrl) {
    return NextResponse.json(
      { error: "Le texte ne peut pas être vide sans média." },
      { status: 400 },
    );
  }

  if (content.length > 1000) {
    return NextResponse.json(
      { error: "Texte trop long (max 1000 caractères)." },
      { status: 400 },
    );
  }

  const updated = await prisma.userPost.update({
    where: { id: postId },
    data: { content },
    select: { id: true, content: true },
  });

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { postId } = await params;

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Utilisateur démo introuvable. Lancez db:seed." },
      { status: 404 },
    );
  }

  const existing = await prisma.userPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: true });
  }

  if (existing.userId !== viewer.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez supprimer que vos publications." },
      { status: 403 },
    );
  }

  await prisma.userPost.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}
