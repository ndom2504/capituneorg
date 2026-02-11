import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { notFound, redirect } from "next/navigation";
import { EventFormModal } from "../../event-form-modal";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getAppViewer();

  if (!viewer || (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN")) {
    redirect("/events");
  }

  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event || event.createdBy !== viewer.id) {
    notFound();
  }

  return (
    <div className="py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">Modifier l'événement</h1>
        <p className="text-muted text-sm">Mettez à jour les informations de votre session ou formation.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
        {/* We reuse the form logic from the modal if possible, or just build a basic form for now */}
        <p className="italic text-muted mb-6">Interface d'édition en cours de synchronisation...</p>
        
        {/* For now, just a placeholder that links back */}
        <div className="flex gap-4">
           <a href="/events/manage" className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-navy">Retour à la gestion</a>
        </div>
      </div>
    </div>
  );
}
