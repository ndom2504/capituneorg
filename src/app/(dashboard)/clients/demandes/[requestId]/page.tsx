import { DemandeDetail } from "@/components/clients/demande-detail";

export default function DemandeDetailPage({ params }: { params: { requestId: string } }) {
  return <DemandeDetail requestId={params.requestId} />;
}
