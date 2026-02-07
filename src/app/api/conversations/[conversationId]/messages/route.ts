import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

// GET /api/conversations/[conversationId]/messages - Récupérer les messages d'une conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const flags = await getFeatureFlagsFromDb();
    if (!flags.messaging) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const viewer = await getAppViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { conversationId } = await params;

    // Vérifier que la conversation existe et que l'utilisateur en fait partie
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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

    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const isParticipant =
      conversation.initiatorId === viewer.id || conversation.recipientId === viewer.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Accès refusé à cette conversation" }, { status: 403 });
    }

    // Récupérer les messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Marquer comme lus les messages reçus
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: viewer.id },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Déterminer l'autre participant
    const otherUser = conversation.initiatorId === viewer.id ? conversation.recipient : conversation.initiator;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        otherUser,
      },
      messages,
    });
  } catch (error) {
    console.error("❌ Erreur GET messages:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
