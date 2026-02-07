import { NextRequest, NextResponse } from "next/server";

import { requireAdminViewer } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationItem = {
  id: string;
  user: { id: string; fullName: string; email: string };
  role: "DEMANDEUR" | "PRO";
  priority: "CRITICAL" | "IMPORTANT" | "INFO";
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const role = (req.nextUrl.searchParams.get("role") ?? "").trim();
  const priority = (req.nextUrl.searchParams.get("priority") ?? "").trim();
  const read = (req.nextUrl.searchParams.get("read") ?? "").trim();

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  try {
    const items = await prisma.notification.findMany({
      where: {
        ...(role ? { role: role as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(read === "unread" ? { readAt: null } : {}),
        ...(read === "read" ? { readAt: { not: null } } : {}),
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { type: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
                { message: { contains: q, mode: "insensitive" } },
                { link: { contains: q, mode: "insensitive" } },
                { user: { id: { contains: q, mode: "insensitive" } } },
                { user: { fullName: { contains: q, mode: "insensitive" } } },
                { user: { email: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    const payload: NotificationItem[] = items.map((n) => ({
      id: n.id,
      user: n.user,
      role: n.role,
      priority: n.priority,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      readAt: toIso(n.readAt),
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({
      canAct: auth.viewer.adminRole === "ADMIN",
      items: payload,
      unavailable: false,
    });
  } catch {
    // DB pas à jour / table manquante : ne pas casser l'admin UI.
    return NextResponse.json({
      canAct: auth.viewer.adminRole === "ADMIN",
      items: [] as NotificationItem[],
      unavailable: true,
    });
  }
}
