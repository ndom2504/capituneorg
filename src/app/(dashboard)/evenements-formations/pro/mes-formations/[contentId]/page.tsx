import { ProTrainingEditor } from "@/components/pro-content/pro-training-editor";

export default function EditFormationPage({ params }: { params: { contentId: string } }) {
  return (
    <ProTrainingEditor
      contentId={params.contentId}
      backHref="/evenements-formations/pro/mes-formations"
    />
  );
}
