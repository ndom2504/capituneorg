import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ProEvenementsLayout({ children }: { children: ReactNode }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    redirect("/accueil");
  }

  const viewer = await getAppViewer();
  if (!viewer) {
    redirect("/auth");
  }

  const isProfessional = viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN";
  if (!isProfessional) {
    redirect("/evenements-formations");
  }

  return children;
}
