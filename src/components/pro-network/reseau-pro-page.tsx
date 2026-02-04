"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { DirectoryPro } from "./pro-directory";
import { ProDirectory } from "./pro-directory";
import { ProCollaborationForm } from "./pro-collaboration-form";
import { ProRequestsManager } from "./pro-requests-manager";
import { ProNetworkManager } from "./pro-network-manager";

type RequestItem = {
  id: string;
  createdAt: string;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  from: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

type PartnershipItem = {
  id: string;
  createdAt: string;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  from: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  to: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

type Network = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  owner: { id: string; fullName: string; email: string };
  members: {
    userId: string;
    role: "OWNER" | "MEMBER";
    user: { id: string; fullName: string; email: string };
  }[];
};

export function ReseauProPageClient({
  directoryPros,
  contactReceived,
  partnershipReceived,
  partnershipSent,
  partnershipActive,
  initialNetworks,
}: {
  directoryPros: DirectoryPro[];
  contactReceived: RequestItem[];
  partnershipReceived: RequestItem[];
  partnershipSent: PartnershipItem[];
  partnershipActive: PartnershipItem[];
  initialNetworks: Network[];
}) {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

  function propose(targetUserId: string) {
    setSelectedUserId(targetUserId);
    const el = document.getElementById("collaboration");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Réseau professionnel CAPITUNE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-muted">
            Connectez-vous à un réseau de professionnels engagés dans des parcours d’immigration responsables et structurés.
          </div>
          <div className="text-muted">
            Le Réseau pro CAPITUNE rassemble des professionnels de différents métiers intervenant dans les parcours d’immigration vers le Canada.
            Il favorise la collaboration, le partage d’expertise et la mise en relation entre intervenants, dans l’intérêt des demandeurs.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-[92px]">
            <Card>
              <CardHeader>
                <CardTitle>Objectif du réseau pro</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  <li>Développer des partenariats fiables</li>
                  <li>Collaborer sur des dossiers complexes</li>
                  <li>Recommander des services complémentaires</li>
                  <li>Partager des bonnes pratiques</li>
                  <li>Renforcer la qualité globale de l’accompagnement</li>
                </ul>
                <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-xs text-muted">
                  Cadre structuré, transparent et conforme.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Règles & conformité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted">
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                  <div className="font-semibold text-text">🔒 Réseau encadré</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Pas de démarchage agressif</li>
                    <li>Pas de partage de données client sans consentement</li>
                    <li>Toute collaboration doit être documentée</li>
                    <li>Respect du cadre légal et déontologique</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <ProCollaborationForm pros={directoryPros} preselectedUserId={selectedUserId} />

            <ProRequestsManager
              contactReceived={contactReceived}
              partnershipReceived={partnershipReceived}
              partnershipSent={partnershipSent}
              partnershipActive={partnershipActive}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="bg-white/70"
                onClick={() => {
                  const el = document.getElementById("annuaire");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Découvrir
              </Button>
              <Button
                className="bg-navy text-white hover:bg-navy/90"
                onClick={() => {
                  const el = document.getElementById("collaboration");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Proposer
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <ProDirectory items={directoryPros} onPropose={propose} />

          <Card id="ressources">
            <CardHeader>
              <CardTitle>Bonnes pratiques & ressources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted">
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                <div className="font-semibold text-text">Guides internes CAPITUNE</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Travailler en collaboration inter‑métiers</li>
                  <li>Cadre éthique & conformité</li>
                  <li>Gestion des dossiers partagés</li>
                </ul>
              </div>
              <div className="text-xs">
                MVP: les liens “chartes / guides / rappels réglementaires” seront ajoutés dans une V2.
              </div>
            </CardContent>
          </Card>

          <ProNetworkManager initialNetworks={initialNetworks} />
        </div>
      </div>
    </div>
  );
}
