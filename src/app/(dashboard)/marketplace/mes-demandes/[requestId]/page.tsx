import { MyRequestThread } from "@/components/marketplace/my-request-thread";

export default async function MesDemandesDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return (
    <div className="space-y-4">
      <MyRequestThread requestId={requestId} />
    </div>
  );
}
