import { MyRequestsList } from "@/components/marketplace/my-requests-list";
import { getAppViewer } from "@/lib/auth/viewer";
import { redirect } from "next/navigation";

export default async function MesDemandesPage() {
  const viewer = await getAppViewer();
  if (!viewer) {
    redirect("/auth");
  }

  if (viewer.accountType !== "USER") {
    redirect("/clients/demandes");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Mes demandes</h1>
        <p className="mt-1 text-sm text-muted">
          Votre boîte de réception: statuts, retours du professionnel, rendez-vous et documents.
        </p>
      </div>

      <MyRequestsList />
    </div>
  );
}
