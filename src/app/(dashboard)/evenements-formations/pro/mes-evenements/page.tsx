import { ProContentList } from "@/components/pro-content/pro-content-list";

export default function MesEvenementsPage() {
  return (
    <ProContentList
      type="EVENT"
      createHref="/evenements-formations/pro/mes-evenements/nouveau"
      editBaseHref="/evenements-formations/pro/mes-evenements"
    />
  );
}
