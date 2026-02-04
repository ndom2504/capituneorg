import type { ReactNode } from "react";

import { ClientsTabs } from "@/components/clients/clients-tabs";
import { Card } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";

export default async function ClientsLayout({ children }: { children: ReactNode }) {
  const viewer = await getAppViewer();

  const isProfessional =
    viewer?.accountType === "ADMIN" || viewer?.accountType === "PROFESSIONAL";

  if (!isProfessional) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            Espace réservé aux professionnels et aux administrateurs.
          </p>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted">Accès refusé.</div>
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
