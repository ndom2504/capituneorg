import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmploiLayout({ children }: { children: ReactNode }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    redirect("/accueil");
  }

  return children;
}
