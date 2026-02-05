import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { JobBrowseView } from "@/components/jobs/job-browse-view";

export default async function ParcourirPage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    redirect("/auth");
  }

  return <JobBrowseView />;
}
