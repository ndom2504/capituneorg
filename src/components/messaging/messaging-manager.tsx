"use client";

import { useState, useEffect } from "react";
import { MessagingWidget } from "./messaging-widget";
import { ConversationWindow } from "./conversation-window";

export function MessagingManager({ currentUserId }: { currentUserId: string }) {
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenConversation = (event: CustomEvent<{ conversationId: string }>) => {
      setOpenConversationId(event.detail.conversationId);
    };

    window.addEventListener("open-conversation" as any, handleOpenConversation);
    return () => {
      window.removeEventListener("open-conversation" as any, handleOpenConversation);
    };
  }, []);

  return (
    <>
      {/* Widget de messagerie */}
      {!openConversationId && (
        <MessagingWidget onOpenConversation={(id) => setOpenConversationId(id)} />
      )}

      {/* Fenêtre de conversation */}
      {openConversationId && (
        <ConversationWindow
          conversationId={openConversationId}
          currentUserId={currentUserId}
          onClose={() => setOpenConversationId(null)}
        />
      )}
    </>
  );
}
