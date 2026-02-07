"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PostItem = {
  id: string;
  user: { id: string; fullName: string; email: string };
  content: string;
  isHidden: boolean;
  commentsLocked: boolean;
  pinnedAt: string | null;
  likes: number;
  shares: number;
  createdAt: string;
};

type ResponsePayload = {
  canAct: boolean;
  items: PostItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const statusOptions = ["", "VISIBLE", "HIDDEN"] as const;

export function AdminCommunityPostsPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PostItem[]>([]);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);

      const url = params.toString() ? `/api/admin/community/posts?${params.toString()}` : "/api/admin/community/posts";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ResponsePayload & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        setItems([]);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError("Erreur réseau.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  async function doAction(postId: string, action: "HIDE" | "RESTORE" | "LOCK_COMMENTS" | "UNLOCK_COMMENTS" | "PIN" | "UNPIN") {
    setError(null);
    setBusyById((prev) => ({ ...prev, [postId]: true }));

    try {
      const res = await fetch("/api/admin/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, action }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyById((prev) => ({ ...prev, [postId]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts</CardTitle>
        <CardDescription>
          Modération V1 (hide/restore, lock/unlock commentaires, pin/unpin).{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} post(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (contenu, auteur, email, id)…"
              />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              aria-label="Filtrer par visibilité"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s ? s : "Tous"}
                </option>
              ))}
            </select>

            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Rafraîchir
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
            Aucun post.
          </div>
        )}

        <div className="space-y-3">
          {rows.map((it) => {
            const busy = !!busyById[it.id];
            const createdLabel = new Date(it.createdAt).toLocaleString();

            return (
              <Card key={it.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">
                      {it.isHidden ? "[HIDDEN] " : ""}
                      {it.pinnedAt ? "[PIN] " : ""}
                      Post
                    </CardTitle>
                    <div className="text-xs text-muted">{createdLabel}</div>
                  </div>
                  <CardDescription>
                    <Link className="underline" href={`/admin/users/${it.user.id}`}>
                      {it.user.fullName}
                    </Link>
                    {` · ${it.user.email}`}
                    {it.commentsLocked ? " · commentaires verrouillés" : ""}
                    {` · 👍 ${it.likes} · 🔁 ${it.shares}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="whitespace-pre-wrap text-sm text-text">{it.content}</div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      disabled={!canAct || busy || it.isHidden}
                      onClick={() => void doAction(it.id, "HIDE")}
                    >
                      Masquer
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || !it.isHidden}
                      onClick={() => void doAction(it.id, "RESTORE")}
                    >
                      Restaurer
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || it.commentsLocked}
                      onClick={() => void doAction(it.id, "LOCK_COMMENTS")}
                    >
                      Lock commentaires
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || !it.commentsLocked}
                      onClick={() => void doAction(it.id, "UNLOCK_COMMENTS")}
                    >
                      Unlock commentaires
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || !!it.pinnedAt}
                      onClick={() => void doAction(it.id, "PIN")}
                    >
                      Pin
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || !it.pinnedAt}
                      onClick={() => void doAction(it.id, "UNPIN")}
                    >
                      Unpin
                    </Button>

                    {!canAct && (
                      <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div>
                    )}
                  </div>

                  <div className="text-xs text-muted">ID: {it.id}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
