"use client";

import * as React from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MessagingManager } from "@/components/messaging/messaging-manager";
import { usePresence } from "@/lib/hooks/usePresence";
import type { AppViewer } from "@/lib/auth/viewer";

export function DashboardShell({
  children,
  isProfessional,
  viewer,
}: {
  children: React.ReactNode;
  isProfessional: boolean;
  viewer: AppViewer | null;
}) {
  // Envoyer automatiquement des heartbeats de présence
  usePresence();

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const mainRef = React.useRef<HTMLElement>(null);

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
    <div className="h-screen overflow-hidden bg-surface text-text">
      <div className="flex h-full w-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          isProfessional={isProfessional}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            onOpenMobile={() => setMobileSidebarOpen(true)}
            viewer={viewer}
            isScrolled={isScrolled}
          />
          <main 
            ref={mainRef}
            className="flex-1 overflow-y-auto px-0 py-2"
            onScroll={(e) => {
              const target = e.currentTarget;
              setIsScrolled(target.scrollTop > 100);
            }}
          >
            <div className="mx-auto w-full max-w-6xl px-3">{children}</div>
          </main>
        </div>
      </div>
      
      {/* Messaging widget */}
      {viewer && <MessagingManager currentUserId={viewer.id} />}
    </div>
  );
}
