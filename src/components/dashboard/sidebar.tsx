"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/components/dashboard/nav-items";
import { EventsSidebarCard } from "@/components/events/events-sidebar-card";
import { BrandMark } from "@/components/ui/brand-mark";
import type { FeatureFlagsSetting } from "@/lib/feature-flags";

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  isProfessional,
  featureFlags,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isProfessional: boolean;
  featureFlags: FeatureFlagsSetting;
}) {
  const pathname = usePathname();

  const navItems = NAV_ITEMS.filter(
    (item) =>
      (!item.professionalOnly || isProfessional) &&
      !(isProfessional && item.hideForProfessionals) &&
      (!item.featureKey || featureFlags[item.featureKey] !== false),
  );

  const showEventsCard = featureFlags.events !== false;

  // Highlight a single active item: choose the most specific match
  // (longest href that matches the current pathname).
  const activeHref =
    navItems
      .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ??
    null;

  const content = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "mb-4 rounded-(--radius-md) bg-surface px-3 py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <BrandMark
          showText={!collapsed}
          subtitle="Orientation & Accompagnement vers le Canada"
          className={cn("flex items-center gap-3", collapsed && "justify-center")}
        />
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (mobileOpen) onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
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
          {showEventsCard ? <EventsSidebarCard /> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "h-full shrink-0 overflow-y-auto border-r border-border bg-white/70 backdrop-blur",
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
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-dvh w-80 border-r border-border bg-white/95 p-4 shadow-xl transition-transform sm:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Dans le drawer mobile on veut toujours les libellés */}
        <SidebarDrawerContent
          activeHref={activeHref}
          onCloseMobile={onCloseMobile}
          navItems={navItems}
          showEventsCard={showEventsCard}
        />
      </aside>
    </>
  );
}

function SidebarDrawerContent({
  activeHref,
  onCloseMobile,
  navItems,
  showEventsCard,
}: {
  activeHref: string | null;
  onCloseMobile: () => void;
  navItems: typeof NAV_ITEMS;
  showEventsCard: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 rounded-(--radius-md) bg-surface px-3 py-3">
        <BrandMark
          showText
          subtitle="Orientation & Accompagnement vers le Canada"
          className="flex items-center gap-3"
        />
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
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
        {showEventsCard ? <EventsSidebarCard /> : null}
      </div>
    </div>
  );
}
