import { redirect } from "next/navigation";

import { getAppViewer } from "@/lib/auth/viewer";
import { EmploymentProfileEditor } from "@/components/jobs/employment-profile-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MonProfilEmploiPage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  return <EmploymentProfileEditor />;
}
