import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  professionalOnly?: boolean;
  hideForProfessionals?: boolean;
};

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
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/accueil", label: "Communauté", icon: icons.home },
  { href: "/marketplace", label: "Marketplace", icon: icons.marketplace },
  {
    href: "/marketplace/mes-demandes",
    label: "Mes demandes",
    icon: icons.inbox,
    hideForProfessionals: true,
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
  },
  {
    href: "/mon-parcours",
    label: "Mon parcours",
    icon: icons.path,
    hideForProfessionals: true,
  },
  {
    href: "/evenements-formations",
    label: "Événements & formations",
    icon: icons.calendar,
  },
  { href: "/mon-dossier", label: "Mon dossier", icon: icons.folder },
  { href: "/profil", label: "Profil", icon: icons.user },
];
