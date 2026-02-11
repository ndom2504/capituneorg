"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors " +
        (active
          ? "border-primary/25 bg-primary/12 text-navy"
          : "border-border bg-white/60 text-text hover:bg-white")
      }
    >
      {children}
    </Link>
  );
}

export function DossierTabs() {
  const pathname = usePathname();
  // Simple check: active if pathname ends with the segment or is exactly the root for "Aperçu"
  const isApercu = pathname === "/mon-dossier";
  const isDocuments = pathname.includes("/documents");
  const isEchanges = pathname.includes("/echanges");
  const isHistorique = pathname.includes("/historique");

  return (
    <div className="flex flex-wrap gap-2">
      <TabLink href="/mon-dossier" active={isApercu}>Aperçu</TabLink>
      <TabLink href="/mon-dossier/documents" active={isDocuments}>Documents</TabLink>
      <TabLink href="/mon-dossier/echanges" active={isEchanges}>Échanges</TabLink>
      <TabLink href="/mon-dossier/historique" active={isHistorique}>Historique</TabLink>
    </div>
  );
}
