import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { ReceivedApplicationsView } from "@/components/jobs/received-applications-view";

export default async function CandidaturesPage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    redirect("/auth");
  }

  const isProfessional =
    viewer.accountType === "PROFESSIONAL" || viewer.accountType === "ADMIN";

  if (!isProfessional) {
    redirect("/emploi");
  }

  return <ReceivedApplicationsView />;
}
