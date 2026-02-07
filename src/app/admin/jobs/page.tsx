import { AdminJobsPanel } from "@/components/admin/jobs/admin-jobs-panel";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminJobsPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    redirect("/admin");
  }

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Pôle emploi</h1>
        <div className="text-sm text-muted">Supervision des offres & candidatures (V1).</div>
      </div>

      <AdminJobsPanel viewerRole={role} />
    </div>
  );
}
