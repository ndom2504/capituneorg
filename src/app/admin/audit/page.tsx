import { AdminAuditLogViewer } from "@/components/admin/audit/admin-audit-log-viewer";
import { getAppViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminAuditPage() {
  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Audit logs</h1>
        <div className="text-sm text-muted">Historique des actions admin (V1).</div>
      </div>

      <AdminAuditLogViewer viewerRole={role} />
    </div>
  );
}
