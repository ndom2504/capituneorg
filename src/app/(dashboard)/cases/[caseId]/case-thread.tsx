"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AvatarBubble } from "@/components/ui/avatar-bubble";

type Message = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: string;
  body: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

type CaseThreadProps = {
  caseId: string;
  viewerId: string;
  viewerRole: "REQUESTER" | "PROFESSIONAL";
  otherUser: { id: string; fullName: string; avatarUrl: string | null; accountType: string };
  status: string;
  initialMessages: Message[];
};

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays < 7) return `${diffDays} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function isImageAttachment(name: string | null, url: string) {
  const target = (name || url).toLowerCase();
  return target.endsWith(".png") || target.endsWith(".jpg") || target.endsWith(".jpeg") || target.endsWith(".webp");
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export function CaseThread({ caseId, viewerId, viewerRole, otherUser, status, initialMessages }: CaseThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ url: string; name: string; size: number; type: string } | null>(null);

  const sortedMessages = useMemo(() => messages.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [messages]);

  async function refresh() {
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch (e) {
      console.error(e);
      setError("Impossible de rafraîchir les messages.");
    }
  }

  async function sendMessage() {
    if (!draft.trim() && !fileInfo) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft, fileUrl: fileInfo?.url, fileName: fileInfo?.name }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const created: Message = data.message;
      setMessages((prev) => [...prev, created]);
      setDraft("");
      setFileInfo(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Erreur d'envoi.");
    } finally {
      setPending(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/cases/${caseId}/attachments`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setFileInfo({ url: data.fileUrl, name: data.fileName, size: file.size, type: file.type });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Upload échoué.");
      setFileInfo(null);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const title = viewerRole === "REQUESTER" ? `Votre pro : ${otherUser.fullName}` : `Client : ${otherUser.fullName}`;

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvatarBubble name={otherUser.fullName} url={otherUser.avatarUrl} size="lg" showOnline={false} />
          <div>
            <p className="text-sm text-muted">{title}</p>
            <p className="text-xs text-muted">Statut: {status}</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="text-sm text-navy hover:underline"
        >
          Rafraîchir
        </button>
      </div>

      <div className="max-h-[520px] overflow-y-auto space-y-3 border border-border/50 rounded-md p-3 bg-slate-50">
        {sortedMessages.length === 0 ? (
          <p className="text-sm text-muted">Aucun message pour le moment.</p>
        ) : (
          sortedMessages.map((m) => {
            const mine = m.authorId === viewerId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                <AvatarBubble name={m.authorName} url={m.authorAvatarUrl} size="sm" showOnline={false} />
                <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${mine ? "bg-navy text-white" : "bg-white text-slate-900 border border-border/70"}`}>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{m.authorName}</span>
                    <span>{formatTime(m.createdAt)}</span>
                  </div>
                  {m.body && <p className="text-sm whitespace-pre-line mt-1">{m.body}</p>}
                  {m.fileUrl && (
                    <Link
                      href={m.fileUrl}
                      className={`mt-2 block rounded border border-border/60 bg-white/70 p-2 text-xs ${mine ? "text-slate-900" : "text-navy"}`}
                      target="_blank"
                    >
                      <div className="flex items-center gap-2">
                        {isImageAttachment(m.fileName, m.fileUrl) ? (
                          <img
                            src={m.fileUrl}
                            alt={m.fileName || "Pièce jointe"}
                            className="h-16 w-16 rounded object-cover border border-border/50"
                          />
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-navy">
                            📎
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold">{m.fileName || "Pièce jointe"}</span>
                          <span className="text-[11px] text-muted">Ouvrir dans un nouvel onglet</span>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {fileInfo && (
          <div className="flex items-center justify-between gap-3 rounded border border-border/70 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-3">
              {isImageAttachment(fileInfo.name, fileInfo.url) ? (
                <img
                  src={fileInfo.url}
                  alt={fileInfo.name}
                  className="h-14 w-14 rounded object-cover border border-border/50"
                />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-white text-xs font-semibold text-navy border border-border/60">
                  📎
                </span>
              )}
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-navy">{fileInfo.name}</span>
                <span className="text-muted">{fileInfo.type || ""} · {formatBytes(fileInfo.size)} · Prête à envoyer</span>
              </div>
            </div>
            <button
              onClick={() => setFileInfo(null)}
              className="text-xs text-navy underline"
              type="button"
            >
              Retirer
            </button>
          </div>
        )}
        <textarea
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          rows={3}
          placeholder="Écrire un message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <label className="inline-flex cursor-pointer items-center gap-2 text-navy">
              <span className="rounded border border-border px-2 py-1 text-xs font-semibold">
                {uploading ? "Upload..." : "Choisir un fichier"}
              </span>
              <input
                type="file"
                className="hidden"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <span>Ctrl/Cmd + Enter pour envoyer</span>
          </div>
          <button
            onClick={sendMessage}
            disabled={pending || uploading || (!draft.trim() && !fileInfo)}
            className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
