import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAppViewer } from "@/lib/auth/viewer";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await getAppViewer();

  const isProfessional =
    viewer?.accountType === "ADMIN" || viewer?.accountType === "PROFESSIONAL";

  return <DashboardShell isProfessional={isProfessional}>{children}</DashboardShell>;
}
