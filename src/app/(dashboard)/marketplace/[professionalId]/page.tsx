import { MarketplaceProfile } from "@/components/marketplace/marketplace-profile";
import { getAppViewer } from "@/lib/auth/viewer";

export default async function MarketplaceProfessionalPage({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const { professionalId } = await params;

  const viewer = await getAppViewer();
  const isSelfProfessional =
    viewer?.accountType === "PROFESSIONAL" && viewer.id === professionalId;

  return (
    <div className="space-y-4">
      <MarketplaceProfile professionalId={professionalId} mode={isSelfProfessional ? "PRO_SELF" : "PUBLIC"} />
    </div>
  );
}
