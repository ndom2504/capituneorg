import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { MyApplicationsView } from "@/components/jobs/my-applications-view";

export default async function MesCandidaturesPage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    redirect("/auth");
  }

  const isProfessional =
    viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN";

  if (isProfessional) {
    redirect("/emploi");
  }

  return <MyApplicationsView />;
}
