import { redirect } from "next/navigation";
import Link from "next/link";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { MarketplaceProfileEditor } from "@/components/clients/marketplace-profile-editor";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MonProfilMarketplacePage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    redirect("/accueil");
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    redirect("/auth");
  }

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
    redirect("/marketplace");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Mon profil marketplace</h1>
          <p className="mt-1 text-sm text-muted">
            Gérez votre profil (publier/suspendre/supprimer) et vos informations publiques.
          </p>
        </div>

        <Link href={`/marketplace/${viewer.id}`}>
          <Button variant="outline">Voir mon profil public</Button>
        </Link>
      </div>

      <MarketplaceProfileEditor />
    </div>
  );
}
