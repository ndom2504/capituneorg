import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatInterface } from "@/components/dossier/chat-interface";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function MonDossierEchangesPage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const dossier = await prisma.dossier.findFirst({
    where: { userId: viewer.id },
    orderBy: { createdAt: "desc" },
    include: { 
        // @ts-ignore - messages relation exists in schema but not yet in client
        messages: {
            orderBy: { createdAt: 'asc' }
        }
    },
  });

  if (!dossier) {
    return <div>Dossier introuvable.</div>;
  }

  // @ts-ignore
  const messages = dossier.messages ?? [];

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Messagerie</CardTitle>
        <CardDescription>
          Échangez directement avec votre conseiller. 
          L'historique est conservé pour le suivi de votre dossier.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 flex-1">
        <ChatInterface 
            dossierId={dossier.id} 
            initialMessages={messages} 
            currentUserId={viewer.id} 
        />
      </CardContent>
    </Card>
  );
}
