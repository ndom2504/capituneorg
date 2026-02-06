"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";
import type { AppViewer } from "@/lib/auth/viewer";

function TopbarTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-(--radius-md) px-3 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary/12 text-navy"
          : "text-text hover:bg-black/5",
      )}
    >
      {children}
    </Link>
  );
}

export function Topbar({
  sidebarCollapsed,
  onToggleCollapse,
  onOpenMobile,
  viewer,
  isScrolled,
}: {
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  viewer: AppViewer | null;
  isScrolled: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-border bg-white/80 backdrop-blur">
      <div className="flex w-full items-center gap-6 px-4 py-3 sm:px-6">
        {/* Gauche: Logo/Menu compact */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-(--radius-md) border border-border bg-white/70 text-navy hover:bg-white sm:hidden"
            onClick={onOpenMobile}
            aria-label="Ouvrir le menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-(--radius-md) border border-border bg-white/70 text-navy hover:bg-white sm:inline-flex lg:w-auto lg:gap-2 lg:px-3"
            onClick={onToggleCollapse}
            aria-label={sidebarCollapsed ? "Déplier" : "Replier"}
          >
            <span className={cn("text-navy", sidebarCollapsed && "rotate-180")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </span>
            <span className="hidden lg:inline text-sm">Menu</span>
          </button>

          <div className="hidden text-sm font-semibold text-navy sm:block">Capitune</div>
        </div>

        {/* Recherche */}
        <div className="hidden shrink-0 md:block">
          <div className="flex w-60 items-center gap-2 rounded-(--radius-md) border border-border bg-white/70 px-3 py-2 text-sm text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" />
            </svg>
            <span>Rechercher…</span>
          </div>
        </div>

        {/* Onglets */}
        <nav className="hidden shrink-0 items-center gap-1 md:flex" aria-label="Navigation principale">
          <TopbarTab href="/mon-dossier" active={pathname.startsWith("/mon-dossier")}>Mon dossier</TopbarTab>
          <TopbarTab href="/emploi" active={pathname.startsWith("/emploi")}>Emploi</TopbarTab>
          <TopbarTab href="/clients" active={pathname.startsWith("/clients")}>Clients</TopbarTab>
          <TopbarTab href="/marketplace" active={pathname.startsWith("/marketplace")}>Marketplace</TopbarTab>
          <TopbarTab href="/mes-demandes" active={pathname.startsWith("/mes-demandes")}>Mes demandes</TopbarTab>
          <TopbarTab href="/mon-parcours" active={pathname.startsWith("/mon-parcours")}>Mon parcours</TopbarTab>
        </nav>

        {/* Spacer pour pousser les actions à droite */}
        <div className="flex-1" />

        {/* Droite: Actions compactes */}
        <div className="flex shrink-0 items-center gap-3">
          {viewer ? (
            <Link href="/profil" className="block">
              <div
                className={cn(
                  "group cursor-pointer transition-all duration-300 ease-out",
                  isScrolled ? "scale-100" : "scale-90 opacity-60",
                )}
              >
                <AvatarBubble
                  name={viewer.fullName}
                  url={viewer.avatarUrl}
                  size="lg"
                  className="ring-2 ring-white shadow-lg transition-transform group-hover:scale-110"
                  showOnline={true}
                  userId={viewer.id}
                />
              </div>
            </Link>
          ) : null}

          <NotificationsBell />

          <Link href="/profil">
            <Button className="bg-navy hover:bg-navy/90">Mon profil</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
