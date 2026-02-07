import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

// GET /api/conversations - Récupérer toutes les conversations de l'utilisateur connecté
export async function GET() {
  try {
    const flags = await getFeatureFlagsFromDb();
    if (!flags.messaging) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const viewer = await getAppViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer les conversations où l'utilisateur est initiator ou recipient
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { initiatorId: viewer.id },
          { recipientId: viewer.id },
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Dernier message
          select: {
            id: true,
            content: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // Compter les messages non lus pour chaque conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: viewer.id },
            isRead: false,
          },
        });

        // Déterminer l'autre participant
        const otherUser = conv.initiatorId === viewer.id ? conv.recipient : conv.initiator;

        return {
          id: conv.id,
          otherUser,
          lastMessage: conv.messages[0] || null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error("❌ Erreur GET conversations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/conversations - Créer ou récupérer une conversation avec un utilisateur
export async function POST(request: Request) {
  try {
    const flags = await getFeatureFlagsFromDb();
    if (!flags.messaging) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const viewer = await getAppViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { otherUserId } = body;

    if (!otherUserId || typeof otherUserId !== "string") {
      return NextResponse.json({ error: "otherUserId requis" }, { status: 400 });
    }

    // Vérifier que l'autre utilisateur existe
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        accountType: true,
        marketplaceProfile: { select: { id: true } },
      },
    });

    if (!otherUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Règle métier : messages uniquement entre USER (demandeur) et PROFESSIONAL (pro)
    const viewerIsPro = viewer.accountType === "PROFESSIONAL" && !!viewer.marketplaceProfile;
    const otherIsPro = otherUser.accountType === "PROFESSIONAL" && !!otherUser.marketplaceProfile;

    // Au moins un des deux doit être pro, et l'autre demandeur
    const isValidConversation =
      (viewerIsPro && !otherIsPro) || (!viewerIsPro && otherIsPro);

    if (!isValidConversation) {
      return NextResponse.json(
        { error: "Messages uniquement entre demandeurs et professionnels" },
        { status: 403 }
      );
    }

    // Chercher une conversation existante (bidirectionnelle)
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { initiatorId: viewer.id, recipientId: otherUserId },
          { initiatorId: otherUserId, recipientId: viewer.id },
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            accountType: true,
          },
        },
      },
    });

    // Si pas de conversation, en créer une
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          initiatorId: viewer.id,
          recipientId: otherUserId,
        },
        include: {
          initiator: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              accountType: true,
            },
          },
          recipient: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              accountType: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("❌ Erreur POST conversations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
