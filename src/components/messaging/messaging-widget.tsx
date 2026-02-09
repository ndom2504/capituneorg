"use client";

import { useState, useEffect } from "react";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { AppHelpBot } from "@/components/messaging/app-help-bot";

type ConversationItem = {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    accountType: string;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    isRead: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
};

export function MessagingWidget({ onOpenConversation }: { onOpenConversation: (conversationId: string) => void }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Erreur fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  function truncateMessage(msg: string, maxLength = 40) {
    return msg.length > maxLength ? msg.substring(0, maxLength) + "..." : msg;
  }

  return (
    <>
      <AppHelpBot hidden={isOpen} />
      {/* Bouton flottant en bas à droite */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg hover:bg-navy/90 transition-transform hover:scale-105"
          aria-label="Messagerie"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* Widget de messagerie */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-lg border border-border bg-white shadow-2xl">
          {/* En-tête */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-navy">Messagerie</h3>
              {totalUnread > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Bouton trois points (plus d'options) */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
                  aria-label="Plus d'options"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                {/* Menu déroulant */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-10 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        fetchConversations();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-black/5"
                    >
                      Actualiser
                    </button>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-black/5"
                    >
                      Paramètres
                    </button>
                  </div>
                )}
              </div>

              {/* Bouton fermer */}
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
                aria-label="Fermer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Liste des conversations */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">
                Aucun message pour le moment
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onOpenConversation(conv.id);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-black/5"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <AvatarBubble
                      name={conv.otherUser.fullName}
                      url={conv.otherUser.avatarUrl}
                      size="md"
                      showOnline={false}
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold text-sm text-navy">
                        {conv.otherUser.fullName}
                      </p>
                      {conv.lastMessage && (
                        <span className="shrink-0 text-xs text-muted">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p
                        className={`truncate text-sm ${
                          conv.unreadCount > 0 ? "font-semibold text-navy" : "text-muted"
                        }`}
                      >
                        {truncateMessage(conv.lastMessage.content)}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
