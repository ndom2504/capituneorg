"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/auth");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={onLogout}
      disabled={loading || props.disabled}
      className={className}
      variant={variant}
      size={size}
      {...props}
    >
      {children ?? (loading ? "Déconnexion…" : "Déconnexion")}
    </Button>
  );
}
