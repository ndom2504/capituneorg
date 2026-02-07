import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getAppViewer();
  const featureFlags = await getFeatureFlagsFromDb();

  // Protection serveur : admin uniquement.
  if (!viewer || viewer.accountType !== "ADMIN") {
    redirect("/accueil");
  }

  // Compte suspendu/supprimé : on sort.
  if (viewer.accountStatus !== "ACTIVE") {
    redirect("/accueil");
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-[1400px]">
        <AdminSidebar featureFlags={featureFlags} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
