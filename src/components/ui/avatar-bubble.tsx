/* eslint-disable @next/next/no-img-element */

import * as React from "react";

import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl" | "xxl";

type Props = {
  name: string;
  url?: string | null;
  size?: Size;
  className?: string;
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

export function AvatarBubble({ name, url, size = "md", className }: Props) {
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

  return (
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
  );
}
