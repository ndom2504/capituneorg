import { AdminEventsPanel } from "@/components/admin/events/admin-events-panel";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminEventsPage() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    redirect("/admin");
  }

  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Événements & Formations</h1>
        <div className="text-sm text-muted">Gestion & calendrier (V1).</div>
      </div>

      <AdminEventsPanel viewerRole={role} />
    </div>
  );
}
