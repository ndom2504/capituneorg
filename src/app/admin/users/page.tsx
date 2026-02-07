import { AdminUsersPanel } from "@/components/admin/users/admin-users-panel";
import { getAppViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminUsersPage() {
  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Utilisateurs</h1>
        <div className="text-sm text-muted">Liste & actions (V1).</div>
      </div>

      <AdminUsersPanel viewerRole={role} />
    </div>
  );
}
