
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { ProProfileDashboardClient } from "@/components/pro-profile/dashboard-client";

export default async function DashboardProfilePage() {
  const viewer = await getAppViewer();

  if (!viewer) {
    redirect("/auth/login?callbackUrl=/pro/profile");
  }

  if (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN") {
    redirect("/"); // Or show "Upgrade to Pro" page
  }

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    include: { professionalProfile: true }
  });

  if (!user) redirect("/");

  // Ensure profile exists, otherwise create draft?
  // Ideally this happens on signup/upgrade. For now we assume it exists or render empty.
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-navy mb-8">Mon Profil Professionnel</h1>
      <ProProfileDashboardClient user={user} initialProfile={user.professionalProfile} />
    </div>
  );
}
