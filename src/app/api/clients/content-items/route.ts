import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gone() {
  return NextResponse.json(
    { error: "Fonctionnalité supprimée (V1)." },
    { status: 410 },
  );
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}
