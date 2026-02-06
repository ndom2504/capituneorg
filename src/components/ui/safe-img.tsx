"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

function proxiedSrc(src: string): string {
  // Proxy uniquement quelques hosts connus pour éviter un open-proxy.
  try {
    if (!src.startsWith("http://") && !src.startsWith("https://")) return src;
    const u = new URL(src);
    const allow = new Set([
      "lh3.googleusercontent.com",
      "firebasestorage.googleapis.com",
      "platform-lookaside.fbsbx.com",
    ]);
    if (!allow.has(u.hostname)) return src;
    return `/api/media-proxy?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

export function SafeImg({ src, alt, className, fallback }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return fallback ?? null;
  }

  const finalSrc = proxiedSrc(src);

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
