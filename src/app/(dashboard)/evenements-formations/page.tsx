import { EventHub } from "@/components/events/event-hub";
import { getAppViewer } from "@/lib/auth/viewer";

export default async function EvenementsFormationsPage() {
  const viewer = await getAppViewer();
  
  return (
    <div className="mx-auto max-w-5xl">
      <EventHub viewer={viewer} />
    </div>
  );
}
