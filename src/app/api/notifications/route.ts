import { NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getAppViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId: viewer.id, readAt: null } }),
      prisma.notification.findMany({
        where: { userId: viewer.id },
        orderBy: { createdAt: "desc" },
        take: 7,
      }),
    ]);

    return NextResponse.json({ unreadCount, notifications });
  } catch {
    // Table non migrée (ou DB non à jour) : on renvoie vide pour ne pas casser l’UI.
    return NextResponse.json({ unreadCount: 0, notifications: [], unavailable: true });
  }
}
