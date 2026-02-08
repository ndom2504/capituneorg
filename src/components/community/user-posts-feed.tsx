"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ApiComment = {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
  createdAtLabel?: string;
};

type ApiPost = {
  id: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  title?: string | null;
  targetAccountType?: "USER" | "PROFESSIONAL" | "ADMIN" | null;
  isAdminPost?: boolean;
  isHidden?: boolean;
  commentsLocked?: boolean;
  pinnedAt?: string | null;
  createdAt: string;
  createdAtLabel?: string;
  content: string;
  mediaUrl: string | null;
  mediaType: "NONE" | "IMAGE" | "VIDEO";
  likes: number;
  shares: number;
  commentsCount: number;
  likedByViewer: boolean;
  isMine: boolean;
  comments?: ApiComment[];
};

function formatRelativeDateFromIso(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 2) return "à l’instant";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "Hier" : `Il y a ${diffDays} jours`;
}

export function UserPostsFeed({ initialPosts }: { initialPosts: ApiPost[] }) {
  const [posts, setPosts] = React.useState<ApiPost[]>(initialPosts);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [content, setContent] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  async function refresh() {
    const res = await fetch("/api/user-posts", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { posts: ApiPost[] };
    setPosts(data.posts);
  }

  async function onCreatePost() {
    setError(null);

    const text = content.trim();
    if (!text && !file) {
      setError("Ajoutez du texte ou un média.");
      return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.set("content", text);
      if (file) form.set("file", file);

      const res = await fetch("/api/user-posts", {
        method: "POST",
        body: form,
      });

      const payload = (await res.json().catch(() => null)) as
        | { error?: string; post?: ApiPost }
        | null;

      if (!res.ok || !payload?.post) {
        setError(payload?.error ?? "Impossible de publier.");
        return;
      }

      setContent("");
      setFile(null);
      setPosts((prev) => [payload.post as ApiPost, ...prev]);
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleLike(postId: string) {
    const res = await fetch(`/api/user-posts/${postId}/like`, { method: "POST" });
    if (!res.ok) return;
    const data = (await res.json()) as { liked: boolean; likes: number };

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByViewer: data.liked, likes: data.likes }
          : p,
      ),
    );
  }

  async function onShare(postId: string) {
    const res = await fetch(`/api/user-posts/${postId}/share`, { method: "POST" });
    const payload = (await res.json().catch(() => null)) as
      | { shares?: number; error?: string }
      | null;
    if (!res.ok || payload?.shares == null) return;

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, shares: payload.shares! } : p)),
    );
  }

  async function onAddComment(postId: string, message: string) {
    const text = message.trim();
    if (!text) return;

    const res = await fetch(`/api/user-posts/${postId}/comment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const payload = (await res.json().catch(() => null)) as
      | { comment?: ApiComment; commentsCount?: number; error?: string }
      | null;

    if (!res.ok || !payload?.comment || payload.commentsCount == null) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const current = p.comments ?? [];
        return {
          ...p,
          commentsCount: payload.commentsCount!,
          comments: [payload.comment!, ...current].slice(0, 5),
        };
      }),
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-navy">Créer une publication</div>
          </div>
          <Button variant="outline" onClick={refresh} disabled={submitting}>
            Actualiser
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Quoi de neuf ?"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              className="bg-navy hover:bg-navy/90"
              onClick={onCreatePost}
              disabled={submitting}
            >
              Publier
            </Button>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <div className="rounded-(--radius-md) border border-border bg-white/70 p-4 text-sm text-muted">
          Aucune publication utilisateur pour le moment.
        </div>
      ) : null}

      <div className="space-y-0">
        {posts.map((post) => (
          <UserPostCard
            key={post.id}
            post={post}
            onLike={() => onToggleLike(post.id)}
            onShare={() => onShare(post.id)}
            onAddComment={(message) => onAddComment(post.id, message)}
            onRefresh={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function UserPostCard({
  post,
  onLike,
  onShare,
  onAddComment,
  onRefresh,
}: {
  post: ApiPost;
  onLike: () => void;
  onShare: () => void;
  onAddComment: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [comment, setComment] = React.useState("");
  const menuRef = React.useRef<HTMLDetailsElement | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draftContent, setDraftContent] = React.useState(post.content);
  const [saving, setSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const createdLabel = post.createdAtLabel ?? formatRelativeDateFromIso(post.createdAt);
  const audienceLabel =
    post.targetAccountType === "PROFESSIONAL"
      ? "Pros"
      : post.targetAccountType === "USER"
        ? "Demandeurs"
        : post.targetAccountType === "ADMIN"
          ? "Admins"
          : null;

  React.useEffect(() => {
    setDraftContent(post.content);
  }, [post.content]);

  function closeMenu() {
    menuRef.current?.removeAttribute("open");
  }

  async function copyText(text: string) {
    const value = text ?? "";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }

  async function onEditSave() {
    setActionError(null);
    try {
      setSaving(true);
      const res = await fetch(`/api/user-posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { post?: { id: string; content: string }; error?: string }
        | null;

      if (!res.ok || !payload?.post) {
        setActionError(payload?.error ?? "Modification impossible.");
        return;
      }

      setEditing(false);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setActionError(null);
    const ok = window.confirm("Supprimer cette publication ?");
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/user-posts/${post.id}`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok) {
        setActionError(payload?.error ?? "Suppression impossible.");
        return;
      }

      setEditing(false);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      id={`post-${post.id}`}
      className={post.isAdminPost ? "bg-primary/5" : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 rounded-full border border-border bg-white p-1">
            {post.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.authorAvatarUrl}
                alt="Avatar"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
                <span className="text-sm font-bold">
                  {post.authorName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-navy">{post.authorName}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>{createdLabel}</span>
              <span aria-hidden>·</span>
              {post.isAdminPost ? (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Annonce CAPITUNE
                </span>
              ) : (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Utilisateur
                </span>
              )}
              {audienceLabel ? (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Pour : {audienceLabel}
                </span>
              ) : null}
              {post.pinnedAt ? (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Épinglé
                </span>
              ) : null}
              {post.commentsLocked ? (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Commentaires verrouillés
                </span>
              ) : null}
              {post.isHidden ? (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Masqué
                </span>
              ) : null}
              {post.isMine ? (
                <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                  Vous
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <details ref={menuRef} className="relative">
          <summary
            className="list-none inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-(--radius-md) border border-border bg-white/60 text-muted hover:bg-white"
            aria-label="Options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </summary>

          <div className="absolute right-0 top-10 z-10 w-56 overflow-hidden rounded-(--radius-md) border border-border bg-white shadow-lg">
            <MenuItem
              onClick={async () => {
                closeMenu();
                await copyText(post.content);
              }}
              disabled={!post.content}
            >
              Copier le texte
            </MenuItem>

            <MenuItem
              onClick={async () => {
                closeMenu();
                const url = `${window.location.origin}/accueil#post-${post.id}`;
                await copyText(url);
              }}
            >
              Copier le lien
            </MenuItem>

            {post.mediaUrl ? (
              <a
                className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-black/5"
                href={post.mediaUrl}
                download
                onClick={() => closeMenu()}
              >
                Télécharger le média
              </a>
            ) : null}

            <div className="my-1 h-px bg-border" />

            {post.isMine ? (
              <>
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    setEditing(true);
                    setActionError(null);
                    setDraftContent(post.content);
                  }}
                >
                  Modifier
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    void onDelete();
                  }}
                  danger
                >
                  Supprimer
                </MenuItem>
              </>
            ) : (
              <MenuItem
                onClick={() => {
                  closeMenu();
                  setActionError("Signalement: bientôt (démo).");
                }}
              >
                Signaler (démo)
              </MenuItem>
            )}
          </div>
        </details>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.title ? <div className="text-sm font-semibold text-text">{post.title}</div> : null}
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Votre publication…"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-navy hover:bg-navy/90"
                disabled={saving}
                onClick={() => void onEditSave()}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setDraftContent(post.content);
                  setActionError(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : post.content ? (
          <p className="text-sm leading-6 text-text">{post.content}</p>
        ) : null}

        {post.mediaUrl && post.mediaType === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.mediaUrl}
            alt="Média"
            className="max-h-130 w-full rounded-(--radius-md) object-cover"
          />
        ) : null}

        {post.mediaUrl && post.mediaType === "VIDEO" ? (
          <video
            src={post.mediaUrl}
            controls
            className="max-h-130 w-full rounded-(--radius-md) bg-black"
          />
        ) : null}

        {actionError ? (
          <div className="text-sm text-red-700">{actionError}</div>
        ) : null}

        <div className="border-t border-border pt-2">
          <div className="flex items-center justify-between gap-3 py-1 text-xs text-muted">
            <div>
              <span className="font-semibold text-text">{post.likes}</span> j’aime
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="font-semibold text-text">{post.commentsCount}</span> commentaires
              </div>
              <div>
                <span className="font-semibold text-text">{post.shares}</span> partages
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-border">
          <ActionButton onClick={onLike} active={post.likedByViewer}>
            J’aime
          </ActionButton>
          <ActionButton
            onClick={() => {
              const el = document.getElementById(`user-comment-${post.id}`);
              el?.focus();
            }}
            disabled={!!post.commentsLocked}
            title={post.commentsLocked ? "Commentaires verrouillés" : undefined}
          >
            Commenter
          </ActionButton>
          <ActionButton onClick={onShare}>Partager</ActionButton>
        </div>

        {!post.commentsLocked ? (
          <div className="border-t border-border pt-2">
            <div className="flex gap-2">
              <Input
                id={`user-comment-${post.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Écrire un commentaire…"
              />
              <Button
                size="sm"
                onClick={() => {
                  onAddComment(comment);
                  setComment("");
                }}
              >
                Publier
              </Button>
            </div>

            {post.comments && post.comments.length > 0 ? (
              <div className="mt-2 divide-y divide-border">
                {post.comments.map((c) => (
                  <div key={c.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-navy">{c.authorName}</div>
                      <div className="text-xs text-muted">
                        {c.createdAtLabel ?? formatRelativeDateFromIso(c.createdAt)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-text">{c.message}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "block w-full px-3 py-2 text-left text-sm hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 " +
        (danger ? "text-red-700" : "text-text")
      }
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        "inline-flex h-10 flex-1 items-center justify-center bg-transparent text-sm font-semibold text-muted hover:bg-black/5 hover:text-text disabled:cursor-not-allowed disabled:opacity-60" +
        (active ? " text-navy" : "")
      }
    >
      {children}
    </button>
  );
}
