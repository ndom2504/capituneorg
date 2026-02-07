import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BassinDesDemandesPage() {
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

  // Alias: il existe déjà un onglet Demandes côté PRO.
  redirect("/clients/demandes");
}
