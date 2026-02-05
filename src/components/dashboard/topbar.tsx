import Link from "next/link";

import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { cn } from "@/lib/cn";

export function Topbar({
  sidebarCollapsed,
  onToggleCollapse,
  onOpenMobile,
}: {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-white/70 text-navy hover:bg-white sm:hidden"
            onClick={onOpenMobile}
            aria-label="Ouvrir le menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            className="hidden h-10 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text hover:bg-white sm:inline-flex"
            onClick={onToggleCollapse}
            aria-label="Réduire/agrandir la barre latérale"
          >
            <span className={cn("text-navy", sidebarCollapsed && "rotate-180")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </span>
            <span className="hidden lg:inline">Menu</span>
          </button>

          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-navy">Capitune</div>
            <div className="text-xs text-muted">Communauté & dossiers</div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2">
          <div className="hidden md:flex w-full max-w-xl items-center gap-2 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 py-2 text-sm text-muted lg:max-w-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" />
            </svg>
            <span>Rechercher…</span>
          </div>

          <NotificationsBell />

          <Link href="/profil">
            <Button className="bg-navy hover:bg-navy/90">Mon profil</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
