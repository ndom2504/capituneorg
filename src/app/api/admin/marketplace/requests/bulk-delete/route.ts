import { NextResponse } from "next/server";

import { requireAdminActionViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  ids?: unknown;
};

function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

export async function POST(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as Payload | null;
  const ids = normalizeIds(body?.ids);

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids requis." }, { status: 400 });
  }

  if (ids.length > 200) {
    return NextResponse.json({ error: "Trop d'ids (max 200)." }, { status: 400 });
  }

  const result = await prisma.marketplaceRequest.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ ok: true, deletedCount: result.count });
}
