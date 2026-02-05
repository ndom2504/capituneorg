"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Comment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type Post = {
  id: string;
  adminLabel: string;
  createdAt: string;
  content: string;
  likes: number;
  shares: number;
  comments: Comment[];
};

export function AdminFeed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = React.useState<Post[]>(initialPosts);

  function onLike(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p)),
    );
  }

  function onShare(postId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, shares: p.shares + 1 } : p,
      ),
    );
  }

  function onAddComment(postId: string, message: string) {
    if (!message.trim()) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newComment: Comment = {
          id: crypto.randomUUID(),
          author: "Vous",
          message: message.trim(),
          createdAt: "à l’instant",
        };
        return { ...p, comments: [newComment, ...p.comments] };
      }),
    );
  }

  return (
    <div className="space-y-3">

      <div className="space-y-0">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => onLike(post.id)}
            onShare={() => onShare(post.id)}
            onAddComment={(message) => onAddComment(post.id, message)}
          />
        ))}
      </div>
    </div>
  );
}

function PostCard({
  post,
  onLike,
  onShare,
  onAddComment,
}: {
  post: Post;
  onLike: () => void;
  onShare: () => void;
  onAddComment: (message: string) => void;
}) {
  const [comment, setComment] = React.useState("");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 rounded-full border border-border bg-white p-1">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
              <span className="text-sm font-bold">C</span>
            </div>
          </div>
          <div>
            <CardTitle className="leading-5">{post.adminLabel}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>{post.createdAt}</span>
              <span aria-hidden>·</span>
              <span className="rounded-full border border-border bg-white/60 px-2 py-0.5">
                Admin
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-white/60 text-muted hover:bg-white"
          aria-label="Options"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-text">{post.content}</p>

        <div className="border-t border-border pt-2">
          <div className="flex items-center justify-between gap-3 py-1 text-xs text-muted">
            <div>
              <span className="font-semibold text-text">{post.likes}</span> j’aime
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="font-semibold text-text">{post.comments.length}</span>{" "}
                commentaires
              </div>
              <div>
                <span className="font-semibold text-text">{post.shares}</span> partages
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-border">
          <ActionButton onClick={onLike}>J’aime</ActionButton>
          <ActionButton
            onClick={() => {
              const el = document.getElementById(`comment-${post.id}`);
              el?.focus();
            }}
          >
            Commenter
          </ActionButton>
          <ActionButton onClick={onShare}>Partager</ActionButton>
        </div>

        <div className="flex gap-2">
          <Input
            id={`comment-${post.id}`}
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

        {post.comments.length > 0 ? (
          <div className="divide-y divide-border">
            {post.comments.map((c) => (
              <div key={c.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-navy">{c.author}</div>
                  <div className="text-xs text-muted">{c.createdAt}</div>
                </div>
                <div className="mt-1 text-sm text-text">{c.message}</div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 flex-1 items-center justify-center bg-transparent text-sm font-semibold text-muted hover:bg-black/5 hover:text-text"
    >
      {children}
    </button>
  );
}
