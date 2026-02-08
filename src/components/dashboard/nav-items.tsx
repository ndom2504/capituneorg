import type { ReactNode } from "react";

export type NavLinkItem = {
  kind?: "link";
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  professionalOnly?: boolean;
  hideForProfessionals?: boolean;
  featureKey?: "community" | "events" | "jobs" | "marketplace" | "messaging" | "notifications" | "proNetwork";
};

export type NavGroupItem = {
  kind: "group";
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  professionalOnly?: boolean;
  hideForProfessionals?: boolean;
  featureKey?: "community" | "events" | "jobs" | "marketplace" | "messaging" | "notifications" | "proNetwork";
  children: NavLinkItem[];
};

export type NavItem = NavLinkItem | NavGroupItem;

function IconWrap({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex h-5 w-5 items-center justify-center",
        className ?? "text-navy",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export const icons = {
  home: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v10h14V10" />
      </svg>
    </IconWrap>
  ),
  path: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 20c6-12 10 4 16-8" />
        <path d="M16 6h4v4" />
      </svg>
    </IconWrap>
  ),
  calendar: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 3v3M17 3v3" />
        <path d="M4 8h16" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
      </svg>
    </IconWrap>
  ),
  folder: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    </IconWrap>
  ),
  user: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    </IconWrap>
  ),
  network: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="7" r="2" />
        <circle cx="18" cy="17" r="2" />
        <path d="M8 12h8" />
        <path d="M8 12l8-5" />
        <path d="M8 12l8 5" />
      </svg>
    </IconWrap>
  ),
  clients: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a3 3 0 0 1 0 5.74" />
      </svg>
    </IconWrap>
  ),
  marketplace: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 2h12l2 6H4l2-6z" />
        <path d="M4 8h16v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8z" />
        <path d="M9 12h6" />
        <path d="M10 16h4" />
      </svg>
    </IconWrap>
  ),
  inbox: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 4h16v12h-4l-2 4h-4l-2-4H4V4z" />
        <path d="M8 10h8" />
      </svg>
    </IconWrap>
  ),
  briefcase: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    </IconWrap>
  ),
  settings: ({ className }: { className?: string }) => (
    <IconWrap className={className}>
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1l-.4-2.6H9.1L8.7 7a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 12a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 2.6h5.8l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z" />
      </svg>
    </IconWrap>
  ),
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/accueil", label: "Communauté", icon: icons.home, featureKey: "community" },
  {
    kind: "group",
    label: "Marketplace",
    icon: icons.marketplace,
    featureKey: "marketplace",
    children: [
      {
        href: "/marketplace/mon-profil-marketplace",
        label: "Mon profil marketplace",
        icon: icons.user,
        professionalOnly: true,
        featureKey: "marketplace",
      },
      {
        href: "/marketplace",
        label: "Marketplace",
        icon: icons.marketplace,
        hideForProfessionals: true,
        featureKey: "marketplace",
      },
      {
        href: "/marketplace/mes-demandes",
        label: "Mes demandes",
        icon: icons.inbox,
        hideForProfessionals: true,
        featureKey: "marketplace",
      },
    ],
  },
  {
    href: "/clients/demandes",
    label: "Demandes",
    icon: icons.inbox,
    professionalOnly: true,
  },
  {
    href: "/clients/preinscriptions",
    label: "Clients",
    icon: icons.clients,
    professionalOnly: true,
  },
  {
    href: "/reseau-pro",
    label: "Réseau pro",
    icon: icons.network,
    professionalOnly: true,
    featureKey: "proNetwork",
  },
  {
    href: "/mon-parcours",
    label: "Mon parcours",
    icon: icons.path,
    hideForProfessionals: true,
  },
  {
    kind: "group",
    label: "Événements & formations",
    icon: icons.calendar,
    featureKey: "events",
    children: [
      {
        href: "/evenements-formations",
        label: "Explorer",
        icon: icons.calendar,
        featureKey: "events",
      },
      {
        href: "/evenements-formations/pro/mes-evenements",
        label: "Mes événements",
        icon: icons.folder,
        professionalOnly: true,
        featureKey: "events",
      },
      {
        href: "/evenements-formations/pro/mes-formations",
        label: "Mes formations",
        icon: icons.folder,
        professionalOnly: true,
        featureKey: "events",
      },
    ],
  },
  // Pôle emploi - Professionnel
  {
    href: "/emploi/mes-offres",
    label: "Mes offres d'emploi",
    icon: icons.briefcase,
    professionalOnly: true,
    featureKey: "jobs",
  },
  {
    href: "/emploi/candidatures",
    label: "Candidatures reçues",
    icon: icons.inbox,
    professionalOnly: true,
    featureKey: "jobs",
  },
  // Pôle emploi - Demandeur
  {
    href: "/emploi/parcourir",
    label: "Offres d'emploi",
    icon: icons.briefcase,
    hideForProfessionals: true,
    featureKey: "jobs",
  },
  {
    href: "/emploi/mes-candidatures",
    label: "Mes candidatures",
    icon: icons.folder,
    hideForProfessionals: true,
    featureKey: "jobs",
  },
  {
    href: "/emploi/mon-profil-emploi",
    label: "Mon profil emploi",
    icon: icons.user,
    hideForProfessionals: true,
    featureKey: "jobs",
  },
  { href: "/mon-dossier", label: "Mon dossier", icon: icons.folder },
  { href: "/profil", label: "Profil", icon: icons.user },
  { href: "/parametres", label: "Paramètres", icon: icons.settings },
];
