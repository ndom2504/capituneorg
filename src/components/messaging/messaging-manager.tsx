"use client";

import { useState, useEffect } from "react";
import { MessagingWidget } from "./messaging-widget";
import { ConversationWindow } from "./conversation-window";

export function MessagingManager({ currentUserId }: { currentUserId: string }) {
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenConversation = async (event: CustomEvent<{ conversationId: string; partnerId?: string }>) => {
      const { conversationId, partnerId } = event.detail;

      if (conversationId === "new" && partnerId) {
        // Create or get conversation logic
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ otherUserId: partnerId }),
          });

          if (res.ok) {
             const data = await res.json();
             if (data.id) {
                 setOpenConversationId(data.id);
             }
          } else {
             console.error("Failed to start conversation");
          }
        } catch (e) {
           console.error(e);
        }
      } else {
        setOpenConversationId(conversationId);
      }
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
