import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { ProfessionalJobOffersView } from "@/components/jobs/professional-job-offers-view";

export default async function MesOffresPage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    redirect("/auth");
  }

  const isProfessional =
    viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN";

  if (!isProfessional) {
    redirect("/emploi/parcourir");
  }

  return <ProfessionalJobOffersView />;
}
