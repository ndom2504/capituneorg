"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export type UserNoteItem = {
  id: string;
  body: string;
  createdAt: string;
  admin: { fullName: string; email: string };
};

export type UserHistoryItem = {
  id: string;
  action: string;
  objectType: string | null;
  objectId: string | null;
  createdAt: string;
  admin: { fullName: string; email: string };
};

type Props = {
  userId: string;
  viewerRole: "ADMIN" | "MODERATOR";
  notes: UserNoteItem[];
  history: UserHistoryItem[];
};

export function AdminUserDetailTabs({ userId, viewerRole, notes, history }: Props) {
  const router = useRouter();
  const canAct = viewerRole === "ADMIN";

  const [tab, setTab] = useState<"NOTES" | "HISTORY">("NOTES");
  const [noteBody, setNoteBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedNotes = useMemo(() => notes, [notes]);
  const sortedHistory = useMemo(() => history, [history]);

  async function addNote() {
    setError(null);
    const body = noteBody.trim();
    if (!body) {
      setError("Note vide.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ADD_NOTE", noteBody: body }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      setNoteBody("");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "NOTES" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("NOTES")}
        >
          Notes
        </Button>
        <Button
          variant={tab === "HISTORY" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("HISTORY")}
        >
          Historique
        </Button>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {tab === "NOTES" && (
        <Card>
          <CardHeader>
            <CardTitle>Notes admin</CardTitle>
            <CardDescription>
              {canAct ? "Ajoutez des notes internes." : "Lecture seule (MODERATOR)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted">Nouvelle note</div>
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Note interne…"
                disabled={!canAct || busy}
              />
              <div className="flex gap-2">
                <Button variant="outline" disabled={!canAct || busy} onClick={() => void addNote()}>
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {sortedNotes.length === 0 ? (
                <div className="text-sm text-muted">Aucune note.</div>
              ) : (
                sortedNotes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-[var(--radius-md)] border border-border bg-white p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <div className="text-sm font-semibold text-navy">{n.admin.fullName}</div>
                      <div className="text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-muted">{n.admin.email}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-text">{n.body}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "HISTORY" && (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>Audit logs liés à l’utilisateur et à son profil (si présent).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedHistory.length === 0 ? (
              <div className="text-sm text-muted">Aucun événement.</div>
            ) : (
              sortedHistory.map((h) => (
                <div
                  key={h.id}
                  className="rounded-[var(--radius-md)] border border-border bg-white p-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="text-sm font-semibold text-navy">{h.action}</div>
                    <div className="text-xs text-muted">{new Date(h.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-muted">
                    Par {h.admin.fullName} · {h.admin.email}
                    {h.objectType ? ` · ${h.objectType}` : ""}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
