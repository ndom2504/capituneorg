import { ProEventEditor } from "@/components/pro-content/pro-event-editor";

export default function EditEvenementPage({ params }: { params: { contentId: string } }) {
  return (
    <ProEventEditor
      contentId={params.contentId}
      backHref="/evenements-formations/pro/mes-evenements"
    />
  );
}
