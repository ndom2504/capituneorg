"use client";

import * as React from "react";

import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";
import { usePresenceStatus } from "@/lib/hooks/usePresence";

export type PresenceStatusManual = "PAUSE" | "ABSENT" | "MUTE" | "MEETING" | null;

const STATUS_OPTIONS: Array<{ value: PresenceStatusManual; label: string }> = [
  { value: null, label: "En ligne" },
  { value: "PAUSE", label: "En pause" },
  { value: "ABSENT", label: "Absent" },
  { value: "MUTE", label: "Muet" },
  { value: "MEETING", label: "En rencontre" },
];

function statusDotClass(status: PresenceStatusManual) {
  if (status === "MEETING") return "bg-red-500";
  if (status === "PAUSE") return "bg-amber-400";
  if (status === "ABSENT") return "bg-slate-400";
  if (status === "MUTE") return "bg-sky-400";
  return "bg-green-500";
}

async function saveStatusManual(statusManual: PresenceStatusManual) {
  const res = await fetch("/api/presence/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statusManual }),
  });

  if (res.status === 404) {
    // Feature masquée (presence désactivée) → no-op
    return;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export function PresenceStatusMenu({
  userId,
  fullName,
  avatarUrl,
  isScrolled,
}: {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  isScrolled: boolean;
}) {
  const presenceData = usePresenceStatus([userId]);
  const serverStatus = (presenceData?.[userId]?.statusManual ?? null) as PresenceStatusManual;

  const [open, setOpen] = React.useState(false);
  const [optimisticStatus, setOptimisticStatus] = React.useState<PresenceStatusManual | undefined>(undefined);

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const effectiveStatus = optimisticStatus ?? serverStatus;

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onPointerDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  async function onSelect(next: PresenceStatusManual) {
    const prev = effectiveStatus;
    setOptimisticStatus(next);
    setOpen(false);

    try {
      await saveStatusManual(next);
    } catch (e) {
      console.error("Erreur MAJ statut:", e);
      setOptimisticStatus(prev);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          "group block cursor-pointer transition-all duration-300 ease-out",
          isScrolled ? "scale-100" : "scale-90 opacity-60",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-label="Changer le statut en ligne"
      >
        <AvatarBubble
          name={fullName}
          url={avatarUrl}
          size="lg"
          className="ring-2 ring-white shadow-lg transition-transform group-hover:scale-110"
          showOnline={true}
          userId={userId}
          statusManualOverride={effectiveStatus}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-100 mt-2 w-52 overflow-hidden rounded-(--radius-md) border border-border bg-surface shadow-lg"
        >
          {STATUS_OPTIONS.map((opt) => {
            const selected = opt.value === effectiveStatus;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="menuitem"
                onClick={() => onSelect(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  "hover:bg-black/5",
                  selected && "bg-black/5",
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full ring-2 ring-white",
                    statusDotClass(opt.value),
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1 text-text">{opt.label}</span>
                {selected ? <span className="text-muted">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
