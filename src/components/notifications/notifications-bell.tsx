"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/cn";

type NotificationDto = {
  id: string;
  title: string;
  message: string;
  link: string;
  priority: "CRITICAL" | "IMPORTANT" | "INFO";
  createdAt: string;
  readAt: string | null;
};

export function NotificationsBell() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  async function refresh() {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) setUnavailable(true);
      return;
    }
    const data = (await res.json()) as {
      unreadCount: number;
      notifications: NotificationDto[];
      unavailable?: boolean;
    };
    setUnreadCount(data.unreadCount ?? 0);
    setItems(data.notifications ?? []);
    setUnavailable(!!data.unavailable);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) setUnavailable(true);
        return;
      }
      const data = (await res.json()) as {
        unreadCount: number;
        notifications: NotificationDto[];
        unavailable?: boolean;
      };
      if (cancelled) return;
      setUnreadCount(data.unreadCount ?? 0);
      setItems(data.notifications ?? []);
      setUnavailable(!!data.unavailable);
    }

    void load();
    // rafraîchit doucement (sans spam)
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const badge = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  function priorityDot(p: NotificationDto["priority"]) {
    return p === "CRITICAL"
      ? "bg-red-600"
      : p === "IMPORTANT"
        ? "bg-orange-500"
        : "bg-slate-400";
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST", keepalive: true });
  }

  function onItemClick(n: NotificationDto) {
    startTransition(async () => {
      setOpen(false);
      if (!n.readAt) {
        // best-effort: ne doit pas bloquer la navigation
        void markRead(n.id);
      }

      // Navigation classique (robuste même si le router client est instable)
      window.location.assign(n.link);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]",
          "border border-border bg-white/70 text-navy hover:bg-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label="Notifications"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) refresh();
        }}
      >
        <BellIcon className="h-5 w-5" />
        {badge ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] overflow-hidden rounded-[var(--radius-md)] border border-border bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="text-sm font-semibold text-navy">Mises à jour</div>
            <Link
              href="/notifications"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Voir tout
            </Link>
          </div>

          <div className="max-h-[360px] overflow-auto">
            {unavailable ? (
              <div className="px-3 py-3 text-sm text-muted">
                Notifications indisponibles (migration en attente).
              </div>
            ) : null}

            {!unavailable && items.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted">Aucune notification.</div>
            ) : null}

            {!unavailable && items.length ? (
              <div className="divide-y divide-border">
                {items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => onItemClick(n)}
                    className={cn(
                      "w-full px-3 py-3 text-left transition-colors hover:bg-black/5",
                      !n.readAt ? "bg-primary/5" : "bg-white",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priorityDot(n.priority))} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text">{n.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted">{n.message}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
