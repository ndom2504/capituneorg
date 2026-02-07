import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export default async function AccueilLayout({ children }: { children: ReactNode }) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.community) {
    redirect("/auth");
  }

  return <>{children}</>;
}
