import { MarketplaceList } from "@/components/marketplace/marketplace-list";

export default function MarketplacePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Marketplace</h1>
        <p className="mt-1 text-sm text-muted">
          Découvrez des professionnels certifiés. Les échanges passent uniquement par une demande de rendez-vous encadrée.
        </p>
      </div>

      <MarketplaceList />
    </div>
  );
}
