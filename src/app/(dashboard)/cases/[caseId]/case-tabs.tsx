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

export function CaseTabs({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const root = `/cases/${caseId}`;

  // Simple active check
  const isApercu = pathname === root;
  const isParcours = pathname.includes("/parcours");
  const isDocuments = pathname.includes("/documents");
  const isEchanges = pathname.includes("/echanges");
  const isNotes = pathname.includes("/notes");
  const isMeetings = pathname.includes("/meetings");
  const isHistorique = pathname.includes("/historique");

  return (
    <div className="flex flex-wrap gap-2">
      <TabLink href={root} active={isApercu}>Aperçu</TabLink>
      <TabLink href={`${root}/parcours`} active={isParcours}>Parcours</TabLink>
      <TabLink href={`${root}/documents`} active={isDocuments}>Documents</TabLink>
      <TabLink href={`${root}/echanges`} active={isEchanges}>Échanges</TabLink>
      <TabLink href={`${root}/notes`} active={isNotes}>Notes</TabLink>
      <TabLink href={`${root}/meetings`} active={isMeetings}>Meetings</TabLink>
      <TabLink href={`${root}/historique`} active={isHistorique}>Historique</TabLink>
    </div>
  );
}
