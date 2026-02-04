"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const TABS = [
  { href: "/clients/preinscriptions", label: "Préinscriptions" },
  { href: "/clients/actifs", label: "Clients actifs" },
  { href: "/clients/demandes", label: "Demandes" },
  { href: "/clients/marketplace-profil", label: "Mon profil Marketplace" },
  { href: "/clients/meetings", label: "Meetings & calendrier" },
  { href: "/clients/historique", label: "Historique" },
] as const;

export function ClientsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-[var(--radius-md)] border px-3 py-2 text-sm",
              active
                ? "border-primary/25 bg-primary/12 text-navy"
                : "border-border bg-white/60 text-text hover:bg-white/80",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
