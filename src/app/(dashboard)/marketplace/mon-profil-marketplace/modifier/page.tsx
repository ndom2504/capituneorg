import { redirect } from "next/navigation";

import { MarketplaceProfileEditor } from "@/components/clients/marketplace-profile-editor";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ModifierProfilMarketplacePage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    redirect("/accueil");
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    redirect("/auth");
  }

  if (viewer.accountType !== "PROFESSIONAL") {
    redirect("/marketplace");
  }

  return <MarketplaceProfileEditor />;
}
