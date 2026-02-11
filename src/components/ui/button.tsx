import * as React from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "outline" | "ghost" | "default" | "destructive" | "secondary" | "link";
type ButtonSize = "sm" | "md" | "icon" | "default" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};


export function getButtonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  // Normalize sizes
  if (size === "default") size = "md";
  // Normalize variants
  if (variant === "default") variant = "primary";
  
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-9 px-3" : 
    size === "icon" ? "h-10 w-10 shrink-0" : 
    size === "lg" ? "h-11 px-8 rounded-md" :
    "h-10 px-4", // md/default
    variant === "primary" &&
      "bg-primary text-white border border-primary/25 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm",
    variant === "destructive" &&
      "bg-red-600 text-white border border-red-600/25 shadow-sm hover:bg-red-700 hover:shadow-md hover:-translate-y-px active:translate-y-0",
    variant === "secondary" &&
      "bg-gray-100 text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-200 hover:shadow-md hover:-translate-y-px active:translate-y-0",
    variant === "link" &&
      "text-primary underline-offset-4 hover:underline",
    variant === "outline" &&
      "bg-white/80 text-text border border-border shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-px active:translate-y-0",
    variant === "ghost" &&
      "bg-transparent text-text hover:bg-black/5",
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  // @ts-ignore - consume asChild if passed accidentally to avoid React warning
  asChild,
  ...props
}: ButtonProps & { asChild?: boolean }) {
  return (
    <button
      type={type}
      className={getButtonClasses(variant, size, className)}
      {...props}
    />
  );
}
