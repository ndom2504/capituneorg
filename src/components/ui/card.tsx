import * as React from "react";

import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-border bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        "shadow-[0_1px_1px_rgba(0,0,0,0.04),0_12px_30px_rgba(31,58,74,0.06)]",
        "transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_1px_1px_rgba(0,0,0,0.04),0_18px_45px_rgba(31,58,74,0.10)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-3", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-navy", className)} {...props} />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-3 pb-3", className)} {...props} />
  );
}
