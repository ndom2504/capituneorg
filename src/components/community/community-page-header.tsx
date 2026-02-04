import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function CommunityPageHeader({
  pageName = "Capitune",
  tagline = "Consulting & gestion administrative · Immigration Canada",
  avatarUrl,
  coverUrl,
  activeTab = "publications",
  isOwner = true,
  viewerAccountType,
}: {
  pageName?: string;
  tagline?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  activeTab?: "publications" | "apropos" | "evenements";
  isOwner?: boolean;
  viewerAccountType?: "USER" | "PROFESSIONAL" | "ADMIN" | null;
}) {
  const startHref =
    viewerAccountType === "PROFESSIONAL" || viewerAccountType === "ADMIN"
      ? "/clients/marketplace-profil"
      : "/mon-parcours";

  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-white/70">
      {/* Cover */}
      <div className="relative h-44 sm:h-56">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt="Couverture"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--capitune-navy),var(--capitune-blue))]" />
        )}
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0_2px,transparent_2px),radial-gradient(circle_at_80%_30%,white_0_2px,transparent_2px),radial-gradient(circle_at_30%_80%,white_0_2px,transparent_2px)] [background-size:48px_48px]" />
        <div className="absolute bottom-3 right-3 hidden sm:block">
          <Button variant="outline" className="bg-white/80">
            Modifier la couverture (bientôt)
          </Button>
        </div>
      </div>

      {/* Profile row */}
      <div className="relative px-4 pb-4 sm:px-6">
        <div className="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-2">
            <div className="h-20 w-20 shrink-0 rounded-full border border-border bg-white p-1 shadow-sm sm:h-24 sm:w-24">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
                  <span className="text-lg font-bold">C</span>
                </div>
              )}
            </div>
            <div className="pl-1">
              <div className="text-lg font-semibold text-navy sm:text-xl">
                {pageName}
              </div>
              <div className="text-sm text-muted">{tagline}</div>
              <div className="mt-1 text-xs text-muted">
                Plateforme de suivi · Publications officielles
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:pb-1">
            {!isOwner ? (
              <>
                <Button className="bg-navy hover:bg-navy/90">Contacter</Button>
                <Button variant="outline" className="bg-white/70">
                  Suivre
                </Button>
              </>
            ) : (
              <Link href={startHref}>
                <Button variant="outline" className="bg-white/70">
                  Démarrer mon parcours
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 border-t border-border pt-3">
          <div className="flex flex-wrap gap-2">
            <Tab href="/accueil" active={activeTab === "publications"}>
              Publications
            </Tab>
            <Tab href="/a-propos" active={activeTab === "apropos"}>
              À propos
            </Tab>
            <Tab href="/evenements-formations" active={activeTab === "evenements"}>
              Événements & formations
            </Tab>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tab({
  active,
  children,
  href,
}: {
  active?: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-primary/12 text-navy"
          : "text-text hover:bg-black/5",
      )}
    >
      {children}
    </Link>
  );
}
