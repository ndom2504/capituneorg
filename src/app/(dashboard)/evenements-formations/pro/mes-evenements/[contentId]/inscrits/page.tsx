import { ProEventEnrollments } from "@/components/pro-content/pro-event-enrollments";

export default function InscritsEvenementPage({ params }: { params: { contentId: string } }) {
  return (
    <ProEventEnrollments
      contentId={params.contentId}
      backHref="/evenements-formations/pro/mes-evenements"
    />
  );
}
