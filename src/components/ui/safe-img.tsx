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

export function SafeImg({ src, alt, className, fallback }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return fallback ?? null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
