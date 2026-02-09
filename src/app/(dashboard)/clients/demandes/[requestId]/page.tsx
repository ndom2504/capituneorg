import { DemandeDetail } from "@/components/clients/demande-detail";
import { redirect } from "next/navigation";

export default function DemandeDetailPage({ params }: { params: { requestId: string } }) {
  if (!params?.requestId) {
    redirect("/clients/demandes");
  }
  return <DemandeDetail requestId={params.requestId} />;
}
