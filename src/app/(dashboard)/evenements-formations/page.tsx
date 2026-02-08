import { EventHub } from "@/components/events/event-hub";
import { getAppViewer } from "@/lib/auth/viewer";
import Link from "next/link";

export default async function EvenementsFormationsPage() {
  const viewer = await getAppViewer();
  
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Événements & formations</h1>
        <Link href="/evenements-formations/catalogue" className="text-sm font-semibold underline">
          Voir le catalogue PRO
        </Link>
      </div>
      <EventHub viewer={viewer} />
    </div>
  );
}
