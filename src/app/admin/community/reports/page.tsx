import { AdminReportsQueue } from "@/components/admin/community/reports/admin-reports-queue";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminCommunityReportsPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) redirect("/admin");

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Rapports & Modération</h1>
        <div className="text-sm text-muted">Signalements (V1).</div>
      </div>

      <AdminReportsQueue viewerRole={role} />
    </div>
  );
}


