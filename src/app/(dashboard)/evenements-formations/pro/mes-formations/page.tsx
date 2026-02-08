import { ProContentList } from "@/components/pro-content/pro-content-list";

export default function MesFormationsPage() {
  return (
    <ProContentList
      type="TRAINING"
      createHref="/evenements-formations/pro/mes-formations/nouveau"
      editBaseHref="/evenements-formations/pro/mes-formations"
    />
  );
}
