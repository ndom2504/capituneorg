"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PUB_FAQ_ITEMS } from "@/app/pub/faq-data";
import { MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
};

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag("event", eventName, params || {});
  }

  if (window.fbq) {
    window.fbq("trackCustom", eventName, params || {});
  }
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function findAnswer(userText: string) {
  const text = normalize(userText);

  for (const item of PUB_FAQ_ITEMS) {
    for (const k of item.keywords) {
      if (text.includes(normalize(k))) {
        return item.answer;
      }
    }
  }

  return (
    "Je n’ai pas trouvé une réponse exacte. Vous pouvez préciser votre situation, ou utiliser le formulaire de contact pour une orientation personnalisée."
  );
}

export function PubChatbot() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const messageIdRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      from: "bot",
      text: "Bonjour ! Posez-moi une question sur les programmes, délais, coûts ou documents.",
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => [
      "Combien de temps ça prend ?",
      "Combien ça coûte ?",
      "Entrée Express, c’est quoi ?",
      "Permis de travail vs résidence permanente ?",
    ],
    [],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u_${messageIdRef.current++}`,
      from: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setValue("");

    track("chatbot_message", { message: trimmed });

    const answer = findAnswer(trimmed);
    const botMsg: ChatMessage = {
      id: `b_${messageIdRef.current++}`,
      from: "bot",
      text: answer,
    };

    // petit délai pour un effet naturel
    window.setTimeout(() => {
      setMessages((prev) => [...prev, botMsg]);
    }, 250);
  }

  function handleOpen() {
    setOpen(true);
    track("chatbot_opened");
  }

  function handleClose() {
    setOpen(false);
    track("chatbot_closed");
  }

  if (!open) {
    return (
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full p-0 shadow-md hover:shadow-lg"
        aria-label="Ouvrir le chatbot"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-88 max-w-[calc(100vw-2rem)] overflow-hidden rounded-(--radius-md) border border-border bg-white/90 shadow-lg">
      <div className="flex items-center justify-between border-b border-border bg-linear-to-r from-primary to-navy px-4 py-3 text-white">
        <div>
          <div className="text-sm font-semibold">Assistant Capitune</div>
          <div className="text-xs text-white/80">Questions fréquentes</div>
        </div>
        <Button
          variant="ghost"
          onClick={handleClose}
          className="h-9 w-9 rounded-full p-0 text-white hover:bg-white/15"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-semibold text-text hover:border-primary/40"
            >
              {s}
            </button>
          ))}
        </div>

        {messages.map((m) => (
          <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.from === "user"
                  ? "max-w-[85%] rounded-(--radius-md) bg-primary px-3 py-2 text-sm text-white"
                  : "max-w-[85%] rounded-(--radius-md) bg-black/5 px-3 py-2 text-sm text-text"
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-white/70 p-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Écrivez votre question…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send(value);
            }
          }}
        />
        <Button
          onClick={() => send(value)}
          className="h-10 w-10 p-0"
          aria-label="Envoyer"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-4 pb-3 text-center text-xs text-muted">
        Pour une réponse personnalisée, utilisez le formulaire.
      </div>
    </div>
  );
}
