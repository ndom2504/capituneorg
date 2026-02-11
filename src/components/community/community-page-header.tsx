import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SafeImg } from "@/components/ui/safe-img";
import { cn } from "@/lib/cn";
import type { FeatureFlagsSetting } from "@/lib/feature-flags";

export function CommunityPageHeader({
  pageName = "Capitune",
  tagline = "Orientation & Accompagnement vers le Canada · Immigration Canada",
  avatarUrl,
  coverUrl,
  activeTab = "publications",
  isOwner = true,
  viewerAccountType,
  featureFlags,
}: {
  pageName?: string;
  tagline?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  activeTab?: "publications" | "apropos" | "evenements";
  isOwner?: boolean;
  viewerAccountType?: "USER" | "PROFESSIONAL" | "ADMIN" | null;
  featureFlags?: FeatureFlagsSetting;
}) {
  const marketplaceEnabled = featureFlags?.marketplace !== false;

  const startHref =
    viewerAccountType === "PROFESSIONAL" || viewerAccountType === "ADMIN"
      ? marketplaceEnabled
        ? "/clients/marketplace-profil"
        : "/mon-parcours"
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
          <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--capitune-blue)_16%,white)]" />
        )}
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0_2px,transparent_2px),radial-gradient(circle_at_80%_30%,white_0_2px,transparent_2px),radial-gradient(circle_at_30%_80%,white_0_2px,transparent_2px)] [background-size:48px_48px]" />
        <div className="absolute bottom-3 right-3 z-10 hidden sm:block">
          {isOwner ? (
            <Link
              href="/profil#cover"
              aria-label="Modifier la couverture"
              title="Modifier la couverture"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                "border border-border bg-white/85 shadow-sm backdrop-blur",
                "transition-[color,background-color,border-color,box-shadow,transform] hover:bg-white hover:shadow-md hover:-translate-y-px active:translate-y-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <span className="sr-only">Modifier la couverture</span>
              <PencilIcon className="h-5 w-5 text-navy" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Profile row */}
      <div className="relative px-4 pb-4 sm:px-6">
        <div className="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-2">
            <div className="relative z-10 h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-white p-1 shadow-sm sm:h-24 sm:w-24">
              <div className="h-full w-full overflow-hidden rounded-full bg-white">
                <SafeImg
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-navy">
                      <span className="text-lg font-bold">C</span>
                    </div>
                  }
                />
              </div>
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
              <Link href="/mon-dossier">
                <Button variant="outline" className="bg-white/70">
                  Démarrer mon dossier
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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
