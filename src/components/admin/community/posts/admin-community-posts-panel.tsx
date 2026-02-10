"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PostItem = {
  id: string;
  user: { id: string; fullName: string; email: string };
  title: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: "NONE" | "IMAGE" | "VIDEO";
  isAdminPost: boolean;
  targetAccountType: "USER" | "PROFESSIONAL" | "ADMIN" | null;
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

  const [officialTitle, setOfficialTitle] = useState("");
  const [officialContent, setOfficialContent] = useState("");
  const [officialAudience, setOfficialAudience] = useState<"" | "USER" | "PROFESSIONAL">("");
  const [officialPosting, setOfficialPosting] = useState(false);
  const [officialOk, setOfficialOk] = useState<string | null>(null);
  const [officialFile, setOfficialFile] = useState<File | null>(null);
  const [officialFileInputKey, setOfficialFileInputKey] = useState(0);

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

  async function publishOfficialPost() {
    setError(null);
    setOfficialOk(null);

    const content = officialContent.trim();
    if (!content) {
      setError("Contenu requis.");
      return;
    }

    try {
      setOfficialPosting(true);

      let mediaUrl: string | null = null;
      let mediaType: "NONE" | "IMAGE" | "VIDEO" = "NONE";

      if (officialFile) {
        const form = new FormData();
        form.set("file", officialFile);

        const uploadRes = await fetch("/api/admin/community/official-post-media", {
          method: "POST",
          body: form,
        });

        const uploadData = (await uploadRes.json().catch(() => null)) as
          | { ok?: boolean; mediaUrl?: string; mediaType?: "IMAGE" | "VIDEO"; error?: string }
          | null;

        if (!uploadRes.ok || !uploadData?.ok || !uploadData.mediaUrl || !uploadData.mediaType) {
          setError(uploadData?.error ?? "Téléversement impossible.");
          return;
        }

        mediaUrl = uploadData.mediaUrl;
        mediaType = uploadData.mediaType;
      }

      const res = await fetch("/api/admin/community/official-posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: officialTitle.trim() || null,
          content,
          targetAccountType: officialAudience ? officialAudience : null,
          mediaUrl,
          mediaType,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; postId?: string; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Publication impossible.");
        return;
      }

      setOfficialTitle("");
      setOfficialContent("");
      setOfficialAudience("");
      setOfficialFile(null);
      setOfficialFileInputKey((k) => k + 1);
      setOfficialOk("Annonce publiée.");
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setOfficialPosting(false);
    }
  }

  return (
    <div className="space-y-3">
      {canAct ? (
        <Card>
          <CardHeader>
            <CardTitle>Annonce admin</CardTitle>
            <CardDescription>Publier une annonce officielle dans le feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {officialOk ? (
              <div className="rounded-(--radius-md) border border-border bg-white p-3 text-sm text-green-700">
                {officialOk}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Titre (optionnel)</div>
                <Input value={officialTitle} onChange={(e) => setOfficialTitle(e.target.value)} placeholder="Titre" />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium text-navy">Audience</div>
                <select
                  className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={officialAudience}
                  onChange={(e) => setOfficialAudience(e.target.value as any)}
                  disabled={officialPosting}
                  aria-label="Audience annonce"
                >
                  <option value="">Tous</option>
                  <option value="USER">Demandeurs</option>
                  <option value="PROFESSIONAL">Pros</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-navy">Contenu</div>
              <textarea
                className="min-h-28 w-full rounded-(--radius-md) border border-border bg-white/85 p-3 text-sm text-text"
                value={officialContent}
                onChange={(e) => setOfficialContent(e.target.value)}
                placeholder="Message…"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-navy">Fichier (optionnel)</div>
              <input
                key={officialFileInputKey}
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                disabled={officialPosting}
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0] ?? null;
                  setOfficialFile(file);
                }}
              />
              {officialFile ? (
                <div className="text-xs text-muted">
                  {officialFile.name} ({Math.round(officialFile.size / 1024)} KB)
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="bg-navy hover:bg-navy/90"
                onClick={() => void publishOfficialPost()}
                disabled={officialPosting}
              >
                {officialPosting ? "Publication…" : "Publier"}
              </Button>
              <Button variant="outline" onClick={() => void load()} disabled={loading || officialPosting}>
                Rafraîchir
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
              className="h-10 w-full rounded-(--radius-md) border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-45"
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
          <div className="rounded-(--radius-md) border border-border bg-white p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-(--radius-md) border border-border bg-white p-3 text-sm text-muted">
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
                      {it.isAdminPost ? "[ADMIN] " : ""}
                      Post
                    </CardTitle>
                    <div className="text-xs text-muted">{createdLabel}</div>
                  </div>
                  <CardDescription>
                    <Link className="underline" href={`/admin/users/${it.user.id}`}>
                      {it.user.fullName}
                    </Link>
                    {` · ${it.user.email}`}
                    {it.title ? ` · ${it.title}` : ""}
                    {it.targetAccountType ? ` · audience: ${it.targetAccountType}` : ""}
                    {it.commentsLocked ? " · commentaires verrouillés" : ""}
                    {` · 👍 ${it.likes} · 🔁 ${it.shares}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {it.mediaUrl ? (
                    <div className="space-y-2">
                      <a
                        className="text-sm underline"
                        href={it.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ouvrir le média
                      </a>

                      {it.mediaType === "IMAGE" ? (
                        <img
                          src={it.mediaUrl}
                          alt="Média"
                          className="max-h-80 w-full rounded-(--radius-md) border border-border object-contain"
                          loading="lazy"
                        />
                      ) : it.mediaType === "VIDEO" ? (
                        <video
                          src={it.mediaUrl}
                          controls
                          className="max-h-80 w-full rounded-(--radius-md) border border-border"
                        />
                      ) : null}
                    </div>
                  ) : null}

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
    </div>
  );
}
