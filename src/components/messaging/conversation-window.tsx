"use client";

import { useState, useEffect, useRef } from "react";
import { AvatarBubble } from "@/components/ui/avatar-bubble";

type Message = {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  isRead: boolean;
  createdAt: string;
};

type ConversationData = {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    accountType: string;
  };
};

export function ConversationWindow({
  conversationId,
  currentUserId,
  onClose,
}: {
  conversationId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Rafraîchir les messages toutes les 5 secondes
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    // Scroller vers le bas quand de nouveaux messages arrivent
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Erreur fetch messages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
      }
    } catch (err) {
      console.error("Erreur envoi message:", err);
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isYesterday) {
      return `Hier ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    }

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-96 items-center justify-center rounded-lg border border-border bg-white shadow-2xl">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-96 flex-col rounded-lg border border-border bg-white shadow-2xl">
      {/* En-tête de la conversation */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <AvatarBubble
            name={conversation.otherUser.fullName}
            url={conversation.otherUser.avatarUrl}
            size="sm"
            showOnline={false}
          />
          <div>
            <h3 className="font-semibold text-sm text-navy">{conversation.otherUser.fullName}</h3>
            <p className="text-xs text-muted">
              {conversation.otherUser.accountType === "PROFESSIONAL" ? "Professionnel" : "Demandeur"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton options */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
            aria-label="Options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {/* Bouton réduire */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
            aria-label="Réduire"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">Aucun message. Commencez la conversation !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[75%] gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    {!isOwn && (
                      <AvatarBubble
                        name={msg.sender.fullName}
                        url={msg.sender.avatarUrl}
                        size="sm"
                        showOnline={false}
                      />
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn ? "bg-navy text-white" : "bg-gray-100 text-navy"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <span className={`mt-1 text-xs text-muted ${isOwn ? "text-right" : "text-left"}`}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-border px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Boutons d'actions (fichiers, GIF, emoji) */}
          <div className="flex gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
              aria-label="Ajouter un fichier"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
              aria-label="GIF"
            >
              <span className="text-xs font-bold">GIF</span>
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
              aria-label="Emoji"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
            </button>
          </div>

          {/* Input de message */}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Rédigez un message…"
            className="flex-1 rounded-full border border-border bg-gray-50 px-4 py-2 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
            disabled={sending}
          />

          {/* Bouton envoyer */}
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white transition-opacity hover:bg-navy/90 disabled:opacity-50"
            aria-label="Envoyer"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
