import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EvenementsFormationsLayout({ children }: { children: ReactNode }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.events) {
    redirect("/accueil");
  }

  return children;
}
