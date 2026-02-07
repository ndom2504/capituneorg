import { ProVerificationQueue } from "@/components/admin/pro-verification/pro-verification-queue";
import { getAppViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export default async function AdminProVerificationPage() {
  const viewer = await getAppViewer();

  // La protection est déjà faite par /admin/layout.tsx
  const role = viewer?.adminRole ?? "MODERATOR";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Vérification Pro</h1>
        <div className="text-sm text-muted">File d’attente des profils à valider (V1).</div>
      </div>

      <ProVerificationQueue viewerRole={role} />
    </div>
  );
}
