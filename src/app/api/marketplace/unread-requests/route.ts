import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/unread-requests
 * Récupère les demandes marketplace avec messages récents:
 * - Pour le PRO: toutes ses demandes avec messages
 * - Pour le demandeur: toutes ses demandes avec messages
 * Note: Pour MVP, on affiche toutes les demandes actives.
 * TODO: Ajouter tracking des messages lus (lastViewedByProfessionalAt, lastViewedByRequesterAt)
 */
export async function GET(_req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountType: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const isPro = user.accountType === "PROFESSIONAL" || user.accountType === "ADMIN";

    const rows = await prisma.marketplaceRequest.findMany({
      where: {
        ...(isPro ? { professionalId: user.id } : { requesterId: user.id }),
        messages: { some: {} },
      },
      select: {
        id: true,
        status: true,
        topic: true,
        requesterLastReadAt: true,
        professionalLastReadAt: true,
        requester: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        professional: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            body: true,
            senderRole: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    });

    const requests = rows.map((req) => {
      const lastMessage = req.messages[0] ?? null;
      const otherUser = isPro ? req.requester : req.professional;
      const lastReadAt = isPro ? req.professionalLastReadAt : req.requesterLastReadAt;

      const unread =
        !!lastMessage &&
        (isPro
          ? lastMessage.senderRole === "REQUESTER"
          : lastMessage.senderRole === "PROFESSIONAL") &&
        (!lastReadAt || lastMessage.createdAt > lastReadAt);

      return {
        id: req.id,
        status: req.status,
        topic: req.topic,
        otherUser,
        openUrl: isPro ? `/clients/demandes/${req.id}` : `/marketplace/mes-demandes/${req.id}`,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              senderRole: lastMessage.senderRole,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
        unreadCount: unread ? 1 : 0,
      };
    });

    return NextResponse.json({ viewerRole: isPro ? "PRO" : "DEMANDEUR", requests });
  } catch (error) {
    console.error("[marketplace/unread-requests] Error:", error);
    return NextResponse.json({ error: "Erreur serveur", requests: [] }, { status: 500 });
  }
}
