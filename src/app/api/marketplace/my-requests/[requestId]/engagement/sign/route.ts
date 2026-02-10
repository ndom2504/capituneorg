import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/marketplace/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOTE: The clone repo can keep stale Prisma types in the editor.
// We go through `any` to avoid false-positive relation/delegate errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = prisma;

type Payload = { fullName?: unknown };

function clampName(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v.length > 120 ? v.slice(0, 120) : v;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
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
      { error: "Espace réservé aux demandeurs." },
      { status: 403 },
    );
  }

  const { requestId } = await context.params;

  const payload = (await req.json().catch(() => null)) as Payload | null;
  const signedByName = clampName(payload?.fullName) || viewer.fullName;

  const request = await db.marketplaceRequest.findFirst({
    where: { id: requestId, requesterId: viewer.id },
    select: {
      id: true,
      professionalId: true,
      engagement: {
        select: { id: true, status: true, signedAt: true },
      },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const engagement = request.engagement;
  if (!engagement) {
    return NextResponse.json({ error: "Aucun contrat." }, { status: 404 });
  }

  if (engagement.status !== "CONTRACT_SENT") {
    if (engagement.status === "SIGNED" || engagement.signedAt) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Contrat non disponible pour signature." }, { status: 400 });
  }

  const now = new Date();

  const updated = await db.marketplaceEngagement.update({
    where: { id: engagement.id },
    data: {
      status: "SIGNED",
      signedAt: now,
      signedByUserId: viewer.id,
      signedByName,
    },
    select: {
      id: true,
      status: true,
      signedAt: true,
      signedByUserId: true,
      signedByName: true,
    },
  });

  await db.marketplaceRequestMessage
    .create({
      data: {
        requestId: request.id,
        senderRole: "SYSTEM",
        kind: "STATUS_UPDATE",
        body: `Contrat signé par le demandeur (${signedByName}).`,
        createdAt: now,
      },
      select: { id: true },
    })
    .catch(() => null);

  // Notifier le professionnel (best-effort)
  await db.notification
    .create({
      data: {
        userId: request.professionalId,
        role: "PRO",
        type: "MARKETPLACE_CONTRACT_SIGNED",
        title: "Contrat signé",
        message: "Le demandeur a signé le contrat. Vous pouvez démarrer la prestation et suivre les jalons.",
        link: `/clients/demandes/${request.id}`,
        priority: "IMPORTANT",
      },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true, engagement: updated });
}
