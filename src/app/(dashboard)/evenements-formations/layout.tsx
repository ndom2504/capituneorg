import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EvenementsFormationsLayout({ children }: { children: ReactNode }) {
  // V1: module évènements/formations hors périmètre.
  redirect("/accueil");
  return children;
}
