import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(params: { origin: string | null; requestHeaders?: string | null }) {
  const allowOrigin = params.origin && params.origin.startsWith("http") ? params.origin : "*";
  const allowHeaders = (params.requestHeaders ?? "").trim() || "Content-Type, Authorization";

  // NOTE: In dev, Vite (5173) calls Next (3001) with Authorization header.
  // We reflect the Origin to allow credentials if ever needed.
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    ...(allowOrigin !== "*" ? { "Access-Control-Allow-Credentials": "true" } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as const;
}

function caseStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Ouvert";
    case "ACCEPTED":
      return "En cours";
    case "IN_PROGRESS":
      return "En cours";
    case "DONE":
      return "Clôturé";
    case "REJECTED":
      return "Clôturé";
    default:
      return status;
  }
}

function guessCategory(title: string) {
  const t = title.toLowerCase();
  if (t.includes("étude") || t.includes("etude") || t.includes("permis d")) return "Études";
  if (t.includes("travail") || t.includes("emploi")) return "Travail";
  if (t.includes("installation") || t.includes("arrivée") || t.includes("arrivee")) return "Installation";
  return "Immigration";
}

function getBearerToken(req: NextRequest) {
  const raw = req.headers.get("authorization") ?? "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

type CreatePayload = {
  title?: string;
  description?: string;
  category?: string;
};

type CaseDocApi = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  slot: string | null;
  status: "PENDING" | "VALIDATED" | "REJECTED";
  updatedAt: Date;
  createdAt: Date;
};

type CaseRow = {
  id: string;
  requesterId: string;
  professionalId: string;
  serviceId: string | null;
  title: string;
  description: string;
  status: string;
  lastActivityAt: Date;
  createdAt: Date;
  requester: { id: string; fullName: string; avatarUrl: string | null; accountType: string };
  professional: { id: string; fullName: string; avatarUrl: string | null; accountType: string };
  documents: CaseDocApi[];
};

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const requestHeaders = req.headers.get("access-control-request-headers");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders({ origin, requestHeaders }),
  });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders({ origin });

  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return NextResponse.json({ error: "Authorization Bearer token requis." }, { status: 401, headers });
    }

    let decoded: { email?: string; name?: string; picture?: string };
    try {
      const auth = getFirebaseAdminAuth();
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Token Firebase invalide." }, { status: 401, headers });
    }

    const email = (decoded.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email indisponible dans le token." }, { status: 400, headers });
    }

    const createFullName = (() => {
      const n = (decoded.name ?? "").trim();
      if (n) return n;
      const local = email.split("@")[0]?.trim();
      return local || "Utilisateur";
    })();

    const avatarUrl = (decoded.picture ?? "").trim() || null;

    const viewer = await prisma.user.upsert({
      where: { email },
      update: avatarUrl ? { avatarUrl } : {},
      create: {
        email,
        fullName: createFullName,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      select: { id: true, accountType: true, fullName: true, avatarUrl: true },
    });

    const isAdmin = viewer.accountType === "ADMIN";

    const rows = (await prisma.case.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [{ requesterId: viewer.id }, { professionalId: viewer.id }],
          },
      orderBy: { lastActivityAt: "desc" },
      take: 100,
      include: {
        requester: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
        professional: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            name: true,
            url: true,
            mimeType: true,
            sizeBytes: true,
            slot: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          } as never,
        },
      },
    })) as unknown as CaseRow[];

    const items = rows.map((c) => {
      const viewerRole =
        c.requesterId === viewer.id ? "REQUESTER" : c.professionalId === viewer.id ? "PROFESSIONAL" : "ADMIN";

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        status: caseStatusLabel(c.status),
        category: guessCategory(c.title),
        createdAt: c.createdAt.toISOString(),
        lastActivityAt: c.lastActivityAt.toISOString(),
        requester: {
          id: c.requester.id,
          fullName: c.requester.fullName,
          avatarUrl: c.requester.avatarUrl,
          accountType: c.requester.accountType,
        },
        professional: {
          id: c.professional.id,
          fullName: c.professional.fullName,
          avatarUrl: c.professional.avatarUrl,
          accountType: c.professional.accountType,
        },
        documents: (c.documents as unknown as CaseDocApi[]).map((d) => ({
          id: d.id,
          name: d.name,
          url: d.url,
          slot: d.slot,
          status: d.status,
          type: d.mimeType || "FILE",
          updatedAt: (d.updatedAt ?? d.createdAt).toISOString(),
        })),
        viewerRole,
      };
    });

    return NextResponse.json({ items }, { status: 200, headers });
  } catch (err) {
    console.error("GET /api/v3/dossiers failed:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders({ origin });

  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return NextResponse.json({ error: "Authorization Bearer token requis." }, { status: 401, headers });
    }

    let decoded: { email?: string; name?: string; picture?: string };
    try {
      const auth = getFirebaseAdminAuth();
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Token Firebase invalide." }, { status: 401, headers });
    }

    const email = (decoded.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email indisponible dans le token." }, { status: 400, headers });
    }

    const body = (await req.json().catch(() => null)) as CreatePayload | null;
    const title = (body?.title ?? "").trim();
    const description = (body?.description ?? "").trim();

    if (!title) {
      return NextResponse.json({ error: "Titre requis." }, { status: 400, headers });
    }
    if (!description) {
      return NextResponse.json({ error: "Description requise." }, { status: 400, headers });
    }

    const createFullName = (() => {
      const n = (decoded.name ?? "").trim();
      if (n) return n;
      const local = email.split("@")[0]?.trim();
      return local || "Utilisateur";
    })();

    const avatarUrl = (decoded.picture ?? "").trim() || null;

    const viewer = await prisma.user.upsert({
      where: { email },
      update: avatarUrl ? { avatarUrl } : {},
      create: {
        email,
        fullName: createFullName,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      select: { id: true },
    });

    // Assignation par défaut: on privilégie un professionnel (pas un admin).
    // Fallback: admin si aucun pro; puis viewer (pour respecter la contrainte DB).
    const triageProfessional = await prisma.user.findFirst({
      where: {
        accountType: "PROFESSIONAL",
        deletedAt: null,
        id: { not: viewer.id },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const triageAdmin = triageProfessional
      ? null
      : await prisma.user.findFirst({
          where: {
            accountType: "ADMIN",
            deletedAt: null,
            id: { not: viewer.id },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

    const professionalId = triageProfessional?.id ?? triageAdmin?.id ?? viewer.id;

    const created = (await prisma.case.create({
      data: {
        requesterId: viewer.id,
        professionalId,
        title,
        description,
        status: "PENDING",
      },
      include: {
        requester: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
        professional: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            name: true,
            url: true,
            mimeType: true,
            sizeBytes: true,
            slot: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          } as never,
        },
      },
    })) as unknown as CaseRow;

    const item = {
      id: created.id,
      title: created.title,
      description: created.description,
      status: caseStatusLabel(created.status),
      category: (body?.category && String(body.category).trim()) || guessCategory(created.title),
      createdAt: created.createdAt.toISOString(),
      lastActivityAt: created.lastActivityAt.toISOString(),
      requester: {
        id: created.requester.id,
        fullName: created.requester.fullName,
        avatarUrl: created.requester.avatarUrl,
        accountType: created.requester.accountType,
      },
      professional: {
        id: created.professional.id,
        fullName: created.professional.fullName,
        avatarUrl: created.professional.avatarUrl,
        accountType: created.professional.accountType,
      },
      documents: (created.documents as unknown as CaseDocApi[]).map((d) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        slot: d.slot,
        status: d.status,
        type: d.mimeType || "FILE",
        updatedAt: (d.updatedAt ?? d.createdAt).toISOString(),
      })),
      viewerRole: "REQUESTER",
    };

    return NextResponse.json({ item }, { status: 201, headers });
  } catch (err) {
    console.error("POST /api/v3/dossiers failed:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500, headers });
  }
}
