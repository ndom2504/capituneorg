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
  const userId = getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accountType: true,
      marketplaceProfile: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const isPro = user.accountType === "PRO" && user.marketplaceProfile;
  const requests: Array<{
    id: string;
    status: string;
    topic: string | null;
    requester: { id: string; fullName: string; avatarUrl: string | null };
    professional: { id: string; fullName: string; avatarUrl: string | null } | null;
    lastMessage: {
      id: string;
      body: string | null;
      senderRole: string;
      createdAt: Date;
    } | null;
    unreadCount: number;
  }> = [];

  if (isPro) {
    // PRO: récupérer les demandes avec messages
    const proRequests = await prisma.marketplaceRequest.findMany({
      where: {
        professionalId: user.marketplaceProfile!.id,
        messages: {
          some: {},
        },
      },
      select: {
        id: true,
        status: true,
        topic: true,
        requester: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
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
        _count: {
          select: {
            messages: {
              where: {
                senderRole: "REQUESTER",
              },
            },
          },
        },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    });

    for (const req of proRequests) {
      requests.push({
        id: req.id,
        status: req.status,
        topic: req.topic,
        requester: req.requester,
        professional: req.professional
          ? {
              id: req.professional.user.id,
              fullName: req.professional.user.fullName,
              avatarUrl: req.professional.user.avatarUrl,
            }
          : null,
        lastMessage: req.messages[0] || null,
        unreadCount: req._count.messages,
      });
    }
  } else {
    // Demandeur: récupérer les demandes avec messages
    const userRequests = await prisma.marketplaceRequest.findMany({
      where: {
        requesterId: userId,
        messages: {
          some: {},
        },
      },
      select: {
        id: true,
        status: true,
        topic: true,
        requester: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        professional: {
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
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
        _count: {
          select: {
            messages: {
              where: {
                senderRole: "PROFESSIONAL",
              },
            },
          },
        },
      },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
    });

    for (const req of userRequests) {
      requests.push({
        id: req.id,
        status: req.status,
        topic: req.topic,
        requester: req.requester,
        professional: req.professional
          ? {
              id: req.professional.user.id,
              fullName: req.professional.user.fullName,
              avatarUrl: req.professional.user.avatarUrl,
            }
          : null,
        lastMessage: req.messages[0] || null,
        unreadCount: req._count.messages,
      });
    }
  }

  return NextResponse.json({ requests });
}
