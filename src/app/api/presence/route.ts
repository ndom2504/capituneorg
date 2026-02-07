import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

/**
 * GET /api/presence?userIds=id1,id2,id3
 * 
 * Retourne le statut en ligne de plusieurs utilisateurs.
 * 
 * V1 Spec:
 * - Pas d'auth requise (données publiques)
 * - Online si: now - lastSeenAt <= 2 minutes
 * - Retour: { userId: { online: boolean, lastSeenAt: string, statusManual: string? } }
 */
export async function GET(req: NextRequest) {
  try {
    const flags = await getFeatureFlagsFromDb();
    if (flags.presence === false) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const userIdsParam = searchParams.get("userIds");

    if (!userIdsParam) {
      return NextResponse.json({ error: "userIds requis" }, { status: 400 });
    }

    const userIds = userIdsParam.split(",").filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json({ error: "userIds vide" }, { status: 400 });
    }

    // Limiter à 100 users max pour éviter les abus
    if (userIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 utilisateurs par requête" },
        { status: 400 }
      );
    }

    // Récupérer les données de présence + confidentialité
    // (Fallback si la migration UserSettings n’est pas encore appliquée)
    let users: Array<{
      id: string;
      lastSeenAt: Date | null;
      statusManual: string | null;
      settings?: { showOnlineStatus: boolean; showLastSeen: boolean } | null;
    }>;

    try {
      users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          lastSeenAt: true,
          statusManual: true,
          settings: {
            select: {
              showOnlineStatus: true,
              showLastSeen: true,
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
        const baseUsers = await db.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            lastSeenAt: true,
            statusManual: true,
          },
        });
        users = baseUsers.map((u) => ({ ...u, settings: null }));
      } else {
        throw e;
      }
    }

    // Calculer le statut online (< 2 minutes)
    const now = new Date();
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    const presenceData: Record<
      string,
      {
        online: boolean;
        lastSeenAt: string | null;
        statusManual: string | null;
      }
    > = {};

    users.forEach((user) => {
      const showOnline = user.settings?.showOnlineStatus ?? true;
      const showLastSeen = user.settings?.showLastSeen ?? true;

      const isOnline = user.lastSeenAt
        ? now.getTime() - user.lastSeenAt.getTime() <= ONLINE_THRESHOLD_MS
        : false;

      presenceData[user.id] = {
        online: showOnline ? isOnline : false,
        lastSeenAt: showLastSeen ? user.lastSeenAt?.toISOString() || null : null,
        statusManual: showOnline ? user.statusManual || null : null,
      };
    });

    return NextResponse.json(presenceData);
  } catch (error) {
    console.error("❌ Erreur GET presence:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du statut" },
      { status: 500 }
    );
  }
}
