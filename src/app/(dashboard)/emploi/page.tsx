import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";

export default async function EmploiPage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    redirect("/auth");
  }

  const isProfessional =
    viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN";

  if (isProfessional) {
    // Redirect to professional job management page
    redirect("/emploi/mes-offres");
  } else {
    // Redirect to job browsing page for demandeurs
    redirect("/emploi/parcourir");
  }
}
