import Link from "next/link";
import { MarketplaceList } from "@/components/marketplace/marketplace-list";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function MarketplacePage() {
  const viewer = await getAppViewer();
  
  let hasMarketplaceProfile = false;
  
  if (viewer) {
    const profile = await prisma.marketplaceProfile.findUnique({
      where: { userId: viewer.id },
      select: { id: true },
    });
    hasMarketplaceProfile = !!profile;
  }

  const canCreateProfile = viewer?.accountType === "PROFESSIONAL" && viewer.isCertified && !hasMarketplaceProfile;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Marketplace</h1>
          <p className="mt-1 text-sm text-muted">
            Découvrez des professionnels certifiés. Les échanges passent uniquement par une demande de rendez-vous encadrée.
          </p>
        </div>
        {canCreateProfile && (
          <Link href="/clients/marketplace-profil">
            <Button className="bg-navy hover:bg-navy/90">
              + Créer mon profil marketplace
            </Button>
          </Link>
        )}
      </div>

      <MarketplaceList />
    </div>
  );
}
