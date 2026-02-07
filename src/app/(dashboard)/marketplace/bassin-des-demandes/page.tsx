import { redirect } from "next/navigation";

import { DemandesList } from "@/components/clients/demandes-list";
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Bassin des demandes</h1>
        <p className="mt-1 text-sm text-muted">
          Demandes qualifiées disponibles. Acceptez pour transformer en client.
        </p>
      </div>

      <DemandesList />
    </div>
  );
}
