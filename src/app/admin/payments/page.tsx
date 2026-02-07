import { AdminPaymentsPanel } from "@/components/admin/payments/admin-payments-panel";
import { getAppViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminPaymentsPage() {
  const viewer = await getAppViewer();
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Paiements</h1>
        <div className="text-sm text-muted">Suivi des paiements & statuts (V1).</div>
      </div>

      <AdminPaymentsPanel viewerRole={role} />
    </div>
  );
}
