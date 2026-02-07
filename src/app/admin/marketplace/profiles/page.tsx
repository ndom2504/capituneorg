import { AdminMarketplaceProfilesPanel } from "@/components/admin/marketplace/profiles/admin-marketplace-profiles-panel";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminMarketplaceProfilesPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.marketplace) {
    redirect("/admin");
  }

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Marketplace</h1>
        <div className="text-sm text-muted">Supervision des profils & services (V1).</div>
      </div>

      <AdminMarketplaceProfilesPanel viewerRole={role} />
    </div>
  );
}
