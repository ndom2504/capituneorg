import Link from "next/link";
import { MarketplaceList } from "@/components/marketplace/marketplace-list";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function MarketplacePage() {
  const viewer = await getAppViewer();
  
  let hasMarketplaceProfile = false;
  const isProfessional = viewer?.accountType === "PROFESSIONAL";
  
  if (viewer && isProfessional) {
    const profile = await prisma.marketplaceProfile.findUnique({
      where: { userId: viewer.id },
      select: { id: true },
    });
    hasMarketplaceProfile = !!profile;
  }

  const canManageProfile = isProfessional;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Marketplace</h1>
          <p className="mt-1 text-sm text-muted">
            Découvrez des professionnels certifiés. Les échanges passent uniquement par une demande de rendez-vous encadrée.
          </p>
        </div>
        {canManageProfile ? (
          <div className="flex items-center gap-2">
            <Link href="/clients/marketplace-profil">
              <Button>
                {hasMarketplaceProfile ? "Modifier mon profil marketplace" : "+ Créer mon profil marketplace"}
              </Button>
            </Link>
            {hasMarketplaceProfile ? (
              <Link href={`/marketplace/${viewer?.id ?? ""}`}>
                <Button variant="outline">Voir mon profil</Button>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <MarketplaceList />
    </div>
  );
}
