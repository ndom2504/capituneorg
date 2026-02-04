import * as React from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 py-2 text-sm text-text",
        "placeholder:text-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        className,
      )}
      {...props}
    />
  );
}
