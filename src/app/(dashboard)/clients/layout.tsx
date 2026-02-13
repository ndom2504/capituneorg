import type { ReactNode } from "react";

import { ClientsTabs } from "@/components/clients/clients-tabs";
import { Card } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";

export default async function ClientsLayout({ children }: { children: ReactNode }) {
  const viewer = await getAppViewer();

  const isProfessional =
    viewer?.accountType === "ADMIN" || viewer?.accountType === "PROFESSIONAL";

  const canAccessClients =
    viewer?.accountType === "ADMIN" ||
    (viewer?.verificationStatus === "CERTIFIED");

  if (!isProfessional) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Espace réservé aux professionnels.
          </p>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted">Accès refusé.</div>
        </Card>
      </div>
    );
  }

  if (!canAccessClients) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Gestion des demandes clients et dossiers.
          </p>
        </div>
        <Card className="p-8 text-center space-y-4">
          <div className="bg-amber-50 text-amber-800 p-4 rounded-lg inline-block text-left max-w-lg">
            <h3 className="font-semibold text-lg mb-2">Accès restreint aux Pros Certifiés</h3>
            <p className="text-sm mb-4">
              L'accès aux demandes clients et aux dossiers complets est réservé aux professionnels <strong>Certifiés</strong> (Diplôme validé).
            </p>
            <p className="text-sm">
              En tant que Pro Vérifié, vous avez accès à l'agenda, aux événements et à la communauté.
              Pour accéder aux missions clients, veuillez compléter votre certification (Diplômes/Ordre professionnel).
            </p>
          </div>
          {/* TODO: Add link to upgrade/upload docs */}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Suivi des préinscriptions, décisions, meetings et historique.
          </p>
        </div>
        <ClientsTabs />
      </div>

      {children}
    </div>
  );
}
