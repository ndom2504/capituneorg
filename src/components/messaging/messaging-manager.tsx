"use client";

import { useState } from "react";
import { MessagingWidget } from "./messaging-widget";
import { ConversationWindow } from "./conversation-window";

export function MessagingManager({ currentUserId }: { currentUserId: string }) {
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

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
