"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { BrandMark } from "@/components/ui/brand-mark";
import type { FeatureFlagsSetting } from "@/lib/feature-flags";

type Item = { href: string; label: string };

const items: Item[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/pro-verification", label: "Vérification Pro" },
  { href: "/admin/community/posts", label: "Communauté" },
  { href: "/admin/marketplace/profiles", label: "Marketplace" },
  { href: "/admin/cases", label: "Demandes & Dossiers" },
  { href: "/admin/events", label: "Événements & Formations" },
  { href: "/admin/jobs", label: "Pôle emploi" },
  { href: "/admin/payments", label: "Paiements" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/community/reports", label: "Rapports & Modération" },
  { href: "/admin/settings", label: "Paramètres plateforme" },
  { href: "/admin/audit", label: "Audit logs" },
];

export function AdminSidebar({ featureFlags }: { featureFlags: FeatureFlagsSetting }) {
  const pathname = usePathname();

  const filteredItems = items.filter((it) => {
    if (it.href.startsWith("/admin/marketplace")) return featureFlags.marketplace !== false;
    if (it.href.startsWith("/admin/jobs")) return featureFlags.jobs !== false;
    if (it.href.startsWith("/admin/events")) return featureFlags.events !== false;
    if (it.href.startsWith("/admin/notifications")) return featureFlags.notifications !== false;
    if (it.href.startsWith("/admin/community")) return featureFlags.community !== false;
    return true;
  });

  return (
    <aside className="w-64 shrink-0 border-r bg-white">
      <div className="px-4 py-4">
        <BrandMark
          showText
          title="CAPITUNE"
          subtitle="Administration"
          className="flex items-center gap-3"
        />
      </div>

      <nav className="px-2 pb-4">
        {filteredItems.map((it) => {
          const active =
            it.href === "/admin"
              ? pathname === "/admin"
              : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm",
                active ? "bg-blue-50 text-navy font-medium" : "text-muted hover:bg-gray-50",
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
