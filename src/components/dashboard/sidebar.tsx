"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/components/dashboard/nav-items";
import { EventsSidebarCard } from "@/components/events/events-sidebar-card";

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  isProfessional,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isProfessional: boolean;
}) {
  const pathname = usePathname();

  const navItems = NAV_ITEMS.filter(
    (item) =>
      (!item.professionalOnly || isProfessional) &&
      !(isProfessional && item.hideForProfessionals),
  );

  const content = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "mb-4 rounded-[var(--radius-md)] bg-surface px-3 py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <div className={cn("text-sm font-semibold text-navy", collapsed && "text-center")}>
          Capitune
        </div>
        {!collapsed ? (
          <div className="text-xs text-muted">
            Consulting & gestion administrative
          </div>
        ) : null}
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (mobileOpen) onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/12 text-navy border border-primary/20"
                  : "text-text hover:bg-black/5",
              )}
            >
              {item.icon({ className: active ? "text-primary" : "text-navy" })}
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="mt-auto">
          <EventsSidebarCard />
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-white/70 backdrop-blur",
          collapsed ? "w-20 p-2" : "w-72 p-4",
        )}
      >
        {content}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity sm:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobile}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-dvh w-80 border-r border-border bg-white/95 p-4 shadow-xl transition-transform sm:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Dans le drawer mobile on veut toujours les libellés */}
        <SidebarDrawerContent
          pathname={pathname}
          onCloseMobile={onCloseMobile}
          navItems={navItems}
        />
      </aside>
    </>
  );
}

function SidebarDrawerContent({
  pathname,
  onCloseMobile,
  navItems,
}: {
  pathname: string;
  onCloseMobile: () => void;
  navItems: typeof NAV_ITEMS;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 rounded-[var(--radius-md)] bg-surface px-3 py-3">
        <div className="text-sm font-semibold text-navy">Capitune</div>
        <div className="text-xs text-muted">
          Consulting & gestion administrative
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/12 text-navy border border-primary/20"
                  : "text-text hover:bg-black/5",
              )}
            >
              {item.icon({ className: active ? "text-primary" : "text-navy" })}
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <EventsSidebarCard />
      </div>
    </div>
  );
}
