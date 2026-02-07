import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export default async function ReseauProLayout({ children }: { children: ReactNode }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.proNetwork) {
    redirect("/accueil");
  }

  return <>{children}</>;
}
