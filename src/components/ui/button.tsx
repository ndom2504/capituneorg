import * as React from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-9 px-3" : "h-10 px-4",
        variant === "primary" &&
          "bg-primary text-white hover:bg-primary/90 border border-primary/20 shadow-sm",
        variant === "outline" &&
          "bg-white/70 text-text border border-border hover:bg-white",
        variant === "ghost" && "bg-transparent text-text hover:bg-black/5",
        className,
      )}
      {...props}
    />
  );
}
