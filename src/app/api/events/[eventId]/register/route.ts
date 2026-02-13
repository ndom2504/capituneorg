import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Cette fonctionnalité n'est plus disponible." },
    { status: 410 },
  );
}
