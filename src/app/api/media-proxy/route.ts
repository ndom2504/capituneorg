import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "firebasestorage.googleapis.com",
  "platform-lookaside.fbsbx.com",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Paramètre 'url' requis." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL invalide." }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "Seules les URLs https sont autorisées." }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "Domaine non autorisé." }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    // On évite les contenus personnalisés par cookies.
    headers: {
      "user-agent": "capitune-media-proxy",
      "accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Image indisponible." }, { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const bytes = await upstream.arrayBuffer();

  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      // Cache court côté navigateur, OK pour avatars.
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
