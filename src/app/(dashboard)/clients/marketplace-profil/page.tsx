import { redirect } from "next/navigation";

import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ClientsMarketplaceProfilPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    redirect("/accueil");
  }

  // Gestion déplacée dans Marketplace (côté PRO)
  redirect("/marketplace/mon-profil-marketplace");
}
