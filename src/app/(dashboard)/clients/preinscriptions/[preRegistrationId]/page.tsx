import { PreinscriptionDetail } from "@/components/clients/preinscription-detail";

export default async function ClientsPreinscriptionDetailPage({
  params,
}: {
  params: Promise<{ preRegistrationId: string }>;
}) {
  const { preRegistrationId } = await params;
  return <PreinscriptionDetail preRegistrationId={preRegistrationId} />;
}
