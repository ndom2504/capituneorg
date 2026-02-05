"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function EventDetailActions({
  eventId,
  initialLikedByViewer,
  initialRegisteredByViewer,
  initialLikesCount,
  initialRegistrationsCount,
}: {
  eventId: string;
  initialLikedByViewer: boolean;
  initialRegisteredByViewer: boolean;
  initialLikesCount: number;
  initialRegistrationsCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [liked, setLiked] = useState(initialLikedByViewer);
  const [registered, setRegistered] = useState(initialRegisteredByViewer);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [registrationsCount, setRegistrationsCount] = useState(initialRegistrationsCount);
  const [error, setError] = useState<string | null>(null);

  function onLike() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/like`, { method: "POST" });
      if (!res.ok) {
        setError("Action impossible (like)");
        return;
      }
      const data = (await res.json()) as { likedByViewer: boolean; likesCount: number };
      setLiked(data.likedByViewer);
      setLikesCount(data.likesCount);
      router.refresh();
    });
  }

  function onRegister() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Action impossible (inscription)");
        return;
      }
      const data = (await res.json()) as {
        registeredByViewer: boolean;
        registrationsCount: number;
      };
      setRegistered(data.registeredByViewer);
      setRegistrationsCount(data.registrationsCount);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onLike} disabled={isPending}>
          {liked ? `Aimé (${likesCount})` : `J’aime (${likesCount})`}
        </Button>
        <Button className="bg-navy hover:bg-navy/90" onClick={onRegister} disabled={isPending}>
          {registered ? `Inscrit (${registrationsCount})` : `S’inscrire (${registrationsCount})`}
        </Button>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
