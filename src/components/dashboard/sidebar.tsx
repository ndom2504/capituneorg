"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { NAV_ITEMS, type NavGroupItem, type NavItem, type NavLinkItem } from "@/components/dashboard/nav-items";
import { EventsSidebarCard } from "@/components/events/events-sidebar-card";
import { BrandMark } from "@/components/ui/brand-mark";
import type { FeatureFlagsSetting } from "@/lib/feature-flags";

function isGroup(item: NavItem): item is NavGroupItem {
  return item.kind === "group";
}

function isLink(item: NavItem): item is NavLinkItem {
  return !isGroup(item);
}

function isVisible(
  item: NavItem,
  isProfessional: boolean,
  featureFlags: FeatureFlagsSetting,
) {
  if (item.professionalOnly && !isProfessional) return false;
  if (isProfessional && item.hideForProfessionals) return false;
  if (item.featureKey && featureFlags[item.featureKey] === false) return false;
  return true;
}

function visibleItems(isProfessional: boolean, featureFlags: FeatureFlagsSetting) {
  return NAV_ITEMS.reduce<NavItem[]>((acc, item) => {
    if (isGroup(item)) {
      if (!isVisible(item, isProfessional, featureFlags)) return acc;
      const children = item.children.filter((c) => isVisible(c, isProfessional, featureFlags));
      if (!children.length) return acc;
      acc.push({ ...item, children });
      return acc;
    }

    if (isVisible(item, isProfessional, featureFlags)) acc.push(item);
    return acc;
  }, []);
}

function allLinks(items: ReturnType<typeof visibleItems>) {
  return items.flatMap((item) => (isGroup(item) ? item.children : [item]));
}

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

  const accountLabel = isProfessional ? "Compte pro" : "Compte demandeur";

  const navItems = visibleItems(isProfessional, featureFlags);

  const showEventsCard = featureFlags.events !== false;

  // Highlight a single active item: choose the most specific match
  // (longest href that matches the current pathname).
  const activeHref =
    allLinks(navItems)
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
          subtitle={accountLabel}
          className={cn("flex items-center gap-3", collapsed && "justify-center")}
        />
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          if (isGroup(item)) {
            const groupHref = item.children[0]?.href ?? "/accueil";
            const groupActive = item.children.some((c) => {
              const href = c.href;
              return activeHref === href || (activeHref != null && activeHref.startsWith(href + "/"));
            });
            return (
              <div key={item.label} className="space-y-1">
                <Link
                  href={groupHref}
                  onClick={() => {
                    if (mobileOpen) onCloseMobile();
                  }}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
                    collapsed && "justify-center px-2",
                    groupActive
                      ? "bg-primary/12 text-navy border border-primary/20"
                      : "text-text hover:bg-black/5",
                  )}
                >
                  {item.icon({ className: groupActive ? "text-primary" : "text-navy" })}
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
                <div className="space-y-1">
                  {item.children.map((child) => {
                    const active = activeHref === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => {
                          if (mobileOpen) onCloseMobile();
                        }}
                        title={collapsed ? `${item.label} · ${child.label}` : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
                          collapsed && "justify-center px-2",
                          !collapsed && "pl-6",
                          active
                            ? "bg-primary/12 text-navy border border-primary/20"
                            : "text-text hover:bg-black/5",
                        )}
                      >
                        {child.icon({ className: active ? "text-primary" : "text-navy" })}
                        {!collapsed ? <span className="truncate">{child.label}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const link = item;
          const active = activeHref === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                if (mobileOpen) onCloseMobile();
              }}
              title={collapsed ? link.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/12 text-navy border border-primary/20"
                  : "text-text hover:bg-black/5",
              )}
            >
              {link.icon({ className: active ? "text-primary" : "text-navy" })}
              {!collapsed ? <span className="truncate">{link.label}</span> : null}
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
          accountLabel={accountLabel}
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
  accountLabel,
}: {
  activeHref: string | null;
  onCloseMobile: () => void;
  navItems: ReturnType<typeof visibleItems>;
  showEventsCard: boolean;
  accountLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 rounded-(--radius-md) bg-surface px-3 py-3">
        <BrandMark
          showText
          subtitle={accountLabel}
          className="flex items-center gap-3"
        />
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          if (isGroup(item)) {
            const groupHref = item.children[0]?.href ?? "/accueil";
            const groupActive = item.children.some((c) => {
              const href = c.href;
              return activeHref === href || (activeHref != null && activeHref.startsWith(href + "/"));
            });
            return (
              <div key={item.label} className="space-y-1">
                <Link
                  href={groupHref}
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
                    groupActive
                      ? "bg-primary/12 text-navy border border-primary/20"
                      : "text-text hover:bg-black/5",
                  )}
                >
                  {item.icon({ className: groupActive ? "text-primary" : "text-navy" })}
                  <span className="truncate">{item.label}</span>
                </Link>
                <div className="space-y-1">
                  {item.children.map((child) => {
                    const active = activeHref === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onCloseMobile}
                        className={cn(
                          "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
                          "pl-6",
                          active
                            ? "bg-primary/12 text-navy border border-primary/20"
                            : "text-text hover:bg-black/5",
                        )}
                      >
                        {child.icon({ className: active ? "text-primary" : "text-navy" })}
                        <span className="truncate">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const link = item;
          const active = activeHref === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/12 text-navy border border-primary/20"
                  : "text-text hover:bg-black/5",
              )}
            >
              {link.icon({ className: active ? "text-primary" : "text-navy" })}
              <span className="truncate">{link.label}</span>
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
