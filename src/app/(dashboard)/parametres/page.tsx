import { getAppViewer } from "@/lib/auth/viewer";
import { SettingsPage } from "@/components/settings/settings-page";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-navy">Paramètres</h1>
        <div className="text-sm text-muted">Non authentifié.</div>
      </div>
    );
  }

  return <SettingsPage viewer={viewer} />;
}
