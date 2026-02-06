/* eslint-disable @next/next/no-img-element */

"use client";

import * as React from "react";
import { usePresenceStatus } from "@/lib/hooks/usePresence";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl" | "xxl";

type Props = {
  name: string;
  url?: string | null;
  size?: Size;
  className?: string;
  showOnline?: boolean; // Afficher l'indicateur en ligne
  userId?: string; // ID utilisateur pour récupérer le statut
};

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).toUpperCase();
}

export function AvatarBubble({ name, url, size = "md", className, showOnline = false, userId }: Props) {
  // Récupérer le statut de présence si demandé
  const presenceData = usePresenceStatus(showOnline && userId ? [userId] : []);
  const isOnline = userId && presenceData?.[userId]?.online;

  // Debug
  React.useEffect(() => {
    if (showOnline && userId) {
      console.log('🟢 Presence data for', userId, ':', presenceData?.[userId]);
    }
  }, [showOnline, userId, presenceData]);

  const dims =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "xxl"
        ? "h-20 w-20 text-lg"
      : size === "xl"
        ? "h-[72px] w-[72px] text-base"
        : size === "lg"
          ? "h-14 w-14 text-base"
          : "h-11 w-11 text-sm";

  // Taille du dot en ligne selon la taille de l'avatar
  const dotSize =
    size === "sm"
      ? "h-2.5 w-2.5"
      : size === "xxl"
        ? "h-5 w-5"
      : size === "xl"
        ? "h-4 w-4"
        : size === "lg"
          ? "h-3.5 w-3.5"
          : "h-3 w-3";

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-full border border-border bg-surface text-navy",
          "grid place-items-center font-semibold",
          dims,
          className,
        )}
        aria-label={name}
        title={name}
      >
        {url ? <img src={url} alt={name} className="h-full w-full rounded-full object-cover" /> : initials(name)}
      </div>

      {/* Indicateur en ligne */}
      {showOnline && isOnline && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full bg-green-500 ring-2 ring-white",
            dotSize,
          )}
          aria-label="En ligne"
        />
      )}
    </div>
  );
}
