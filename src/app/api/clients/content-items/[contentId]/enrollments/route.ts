import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Fonctionnalité supprimée (V1)." },
    { status: 410 },
  );
}
