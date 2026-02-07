import { AdminPlatformSettingsPanel } from "@/components/admin/settings/admin-platform-settings-panel";
import { getAppViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminPlatformSettingsPage() {
  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Paramètres plateforme</h1>
        <div className="text-sm text-muted">Configuration globale (V1).</div>
      </div>

      <AdminPlatformSettingsPanel viewerRole={role} />
    </div>
  );
}
