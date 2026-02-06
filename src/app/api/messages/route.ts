import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

// POST /api/messages - Envoyer un message dans une conversation
export async function POST(request: Request) {
  try {
    const viewer = await getAppViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, content } = body;

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: "Message trop long (max 5000 caractères)" }, { status: 400 });
    }

    // Vérifier que la conversation existe et que l'utilisateur en fait partie
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        initiator: { select: { id: true } },
        recipient: { select: { id: true } },
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

    // Créer le message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: viewer.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Mettre à jour lastMessageAt de la conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("❌ Erreur POST messages:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
