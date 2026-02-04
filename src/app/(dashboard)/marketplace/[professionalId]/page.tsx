import { MarketplaceProfile } from "@/components/marketplace/marketplace-profile";

export default async function MarketplaceProfessionalPage({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const { professionalId } = await params;
  return (
    <div className="space-y-4">
      <MarketplaceProfile professionalId={professionalId} />
    </div>
  );
}
