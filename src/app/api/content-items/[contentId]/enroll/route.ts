import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Fonctionnalité supprimée (V1 sans paiements)." },
    { status: 410 },
  );
}
