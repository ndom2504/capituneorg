"use client";

import * as React from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({
  children,
  isProfessional,
}: {
  children: React.ReactNode;
  isProfessional: boolean;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    // Collapse plus tôt pour que l'effet soit visible sur desktop.
    // (Tailwind xl = 1280px)
    const mql = window.matchMedia("(max-width: 1279px)");

    const apply = () => {
      if (mql.matches) {
        setSidebarCollapsed(true);
      }
    };

    apply();

    // Support navigateurs: addEventListener (moderne) + addListener (legacy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyMql = mql as any;
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    if (typeof legacyMql.addListener === "function") {
      legacyMql.addListener(apply);
      return () => legacyMql.removeListener(apply);
    }
    return;
  }, []);

  return (
    <div className="min-h-dvh bg-surface text-text">
      <div className="flex w-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          isProfessional={isProfessional}
        />
        <div className="min-w-0 flex-1">
          <Topbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            onOpenMobile={() => setMobileSidebarOpen(true)}
          />
          <main className="px-0 py-2">
            <div className="mx-auto w-full max-w-6xl px-3">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
