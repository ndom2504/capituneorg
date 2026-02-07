"use client";

import Image from "next/image";
import * as React from "react";

export function BrandMark({
  showText,
  subtitle,
  title = "Capitune",
  className,
}: {
  showText: boolean;
  subtitle?: string;
  title?: string;
  className?: string;
}) {
  const [src, setSrc] = React.useState("/brand/capitune-logo.png");

  return (
    <div className={className}>
      <Image
        src={src}
        alt={title}
        width={36}
        height={36}
        className="h-9 w-9 rounded-xl"
        priority
        onError={() => setSrc("/brand/capitune-logo.svg")}
      />

      {showText ? (
        <div className="min-w-0">
          <div className="text-sm font-semibold text-navy">{title}</div>
          {subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
