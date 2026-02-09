"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = { role: "user" | "bot"; content: string };

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function answerFor(rawQuestion: string) {
  const q = normalize(rawQuestion);

  const rules: Array<{ test: (q: string) => boolean; answer: string }> = [
    {
      test: (s) => s.includes("qr") || s.includes("scan") || s.includes("telephone") || s.includes("téléphone"),
      answer:
        "Pour téléverser depuis un téléphone : dans votre profil Marketplace, cliquez sur “Générer un QR”, scannez-le, puis envoyez (1) la preuve de compétence et (2) la pièce d’identité. Ensuite, revenez sur ordinateur et cliquez sur “Enregistrer”.",
    },
    {
      test: (s) => s.includes("verification") || s.includes("vérification") || s.includes("certifie") || s.includes("certifié"),
      answer:
        "La vérification pro demande 2 documents : une preuve de compétence + une pièce d’identité. Une fois les deux ajoutés, acceptez la conformité, puis cliquez sur “Demander la vérification” (délai cible 48h).",
    },
    {
      test: (s) => s.includes("publier") || s.includes("publication") || s.includes("visible"),
      answer:
        "Pour publier : complétez le profil, acceptez la conformité, puis cliquez sur “Publier”. Si votre compte n’est pas certifié ou si un métier réglementé exige une validation admin, la publication peut rester en attente.",
    },
    {
      test: (s) => s.includes("brouillon") || s.includes("enregistrer") || s.includes("draft"),
      answer:
        "“Enregistrer” sauvegarde un brouillon. C’est aussi requis pour générer le QR (le lien téléphone a besoin d’un profil existant).",
    },
    {
      test: (s) => s.includes("message") || s.includes("messagerie") || s.includes("conversation"),
      answer:
        "La messagerie est accessible via l’icône en bas à droite. Vous y voyez vos conversations, les messages non lus, et vous pouvez ouvrir un fil pour répondre.",
    },
    {
      test: (s) => s.includes("document") || s.includes("pdf") || s.includes("photo") || s.includes("piece") || s.includes("pièce") || s.includes("identite") || s.includes("identité"),
      answer:
        "Documents acceptés : PDF ou images (photo). Pour la pièce d’identité, essayez de mettre recto/verso dans un seul fichier. Après upload, pensez à cliquer sur “Enregistrer”.",
    },
  ];

  for (const r of rules) {
    if (r.test(q)) return r.answer;
  }

  return (
    "Je peux aider sur : publication du profil, vérification pro (2 documents), QR d’upload téléphone, et messagerie. " +
    "Dites-moi ce que vous essayez de faire."
  );
}

export function AppHelpBot({ hidden }: { hidden?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "bot", content: "Comment puis t’aider aujourd’hui ?" },
  ]);

  const suggestions = useMemo(
    () => [
      "Comment demander la vérification ?",
      "Je veux téléverser via QR sur téléphone",
      "Comment publier mon profil ?",
      "Où trouver la messagerie ?",
    ],
    [],
  );

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "bot", content: answerFor(trimmed) },
    ]);
    setInput("");
  }

  if (hidden) return null;

  return (
    <>
      {/* Petit pop au-dessus de l'icône */}
      {!dismissedPrompt && !isOpen ? (
        <div className="fixed bottom-24 right-6 z-50 w-72">
          <div className="rounded-(--radius-md) border border-border bg-white p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <button
                className="text-left text-sm text-text"
                onClick={() => {
                  setIsOpen(true);
                  setDismissedPrompt(true);
                }}
              >
                <div className="font-semibold">Comment puis t’aider aujourd’hui ?</div>
                <div className="mt-0.5 text-xs text-muted">Cliquez pour poser une question.</div>
              </button>
              <button
                className="shrink-0 rounded-(--radius-md) px-2 py-1 text-xs text-muted hover:bg-black/5"
                aria-label="Fermer l'aide"
                onClick={() => setDismissedPrompt(true)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Panneau d'aide */}
      {isOpen ? (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-lg border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-semibold text-text">Aide</div>
              <div className="text-xs text-muted">Questions sur le fonctionnement de l’app</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
              aria-label="Fermer l'aide"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="rounded-(--radius-md) border border-border bg-white/70 px-2 py-1 text-xs text-text hover:bg-black/5"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={
                    m.role === "user"
                      ? "ml-10 rounded-(--radius-md) bg-black/5 px-3 py-2 text-sm text-text"
                      : "mr-10 rounded-(--radius-md) bg-white/70 px-3 py-2 text-sm text-text"
                  }
                >
                  {m.content}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border px-4 py-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
              />
              <Button type="submit" disabled={!input.trim()}>
                Envoyer
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
