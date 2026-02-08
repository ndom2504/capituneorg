import { redirect } from "next/navigation";

import { AdminCommunityRulesPanel } from "@/components/admin/community/rules/admin-community-rules-panel";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminCommunityRulesPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) redirect("/admin");

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Règles communauté</h1>
        <div className="text-sm text-muted">
          Configuration V1 (publication, commentaires, anti-spam, mots interdits).
        </div>
      </div>

      <AdminCommunityRulesPanel viewerRole={role} />
    </div>
  );
}
