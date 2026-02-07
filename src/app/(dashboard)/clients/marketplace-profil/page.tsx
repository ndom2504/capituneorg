import { redirect } from "next/navigation";

import { MarketplaceProfileEditor } from "@/components/clients/marketplace-profile-editor";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ClientsMarketplaceProfilPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    redirect("/accueil");
  }
  return <MarketplaceProfileEditor />;
}
