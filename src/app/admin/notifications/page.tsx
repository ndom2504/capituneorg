import { AdminNotificationsPanel } from "@/components/admin/notifications/admin-notifications-panel";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminNotificationsPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.notifications) redirect("/admin");

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Notifications</h1>
        <div className="text-sm text-muted">Historique & supervision (V1).</div>
      </div>

      <AdminNotificationsPanel viewerRole={role} />
    </div>
  );
}
