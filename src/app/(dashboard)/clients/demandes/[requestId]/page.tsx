import { DemandeDetail } from "@/components/clients/demande-detail";
import { redirect } from "next/navigation";

export default async function DemandeDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  if (!requestId) {
    redirect("/clients/demandes");
  }
  return <DemandeDetail requestId={requestId} />;
}
