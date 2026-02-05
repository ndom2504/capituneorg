"use client";

import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      // Navigation "hard" pour éviter les incohérences de chunks (404) après déploiement
      // et pour repartir d'un état clean.
      window.location.replace(`/auth?logout=${Date.now()}`);
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
