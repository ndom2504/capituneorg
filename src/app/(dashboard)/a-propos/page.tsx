import type { ReactNode } from "react";

import { CommunityPageHeader } from "@/components/community/community-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export default async function AProposPage() {
  const viewer = await getAppViewer();
  const featureFlags = await getFeatureFlagsFromDb();

  return (
    <div className="w-full space-y-4">
      <CommunityPageHeader
        pageName={viewer?.fullName ?? "Client Capitune"}
        avatarUrl={viewer?.avatarUrl}
        coverUrl={viewer?.coverUrl}
        activeTab="apropos"
        isOwner
        viewerAccountType={viewer?.accountType ?? null}
        featureFlags={featureFlags}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>À propos de CAPITUNE</CardTitle>
              <CardDescription>
                Orientation stratégique et accompagnement responsable vers le Canada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-text leading-6">
              <p>
                CAPITUNE est une plateforme d’orientation stratégique et d’accompagnement conçue pour
                aider les personnes souhaitant vivre une expérience au Canada à comprendre leurs
                options, structurer leur parcours et avancer de manière réaliste, transparente et
                responsable.
              </p>
              <p>
                Le projet est porté par <span className="font-semibold text-navy">Export Monde Prestige Inc.</span>,
                une entreprise immatriculée au Québec, spécialisée dans la consultation en gestion,
                l’accompagnement administratif et le développement de solutions numériques à portée
                internationale.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pourquoi CAPITUNE ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text leading-6">
              <p>
                Les projets d’immigration, d’études ou de mobilité professionnelle vers le Canada sont
                souvent complexes, coûteux et remplis d’informations contradictoires.
              </p>
              <p>
                CAPITUNE est né d’un constat simple : beaucoup de candidats manquent de clarté, de
                structure et d’accompagnement fiable.
              </p>
              <p>
                Notre objectif est de proposer un espace unique où l’information, les outils
                numériques, l’expertise professionnelle et la communauté se rencontrent pour
                permettre à chacun de prendre des décisions éclairées.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Notre mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-text leading-6">
                <p className="font-semibold text-navy">
                  Aligner le potentiel humain avec les bonnes opportunités.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted">
                  <li>Compréhension de vos options réelles</li>
                  <li>Organisation de votre dossier</li>
                  <li>Planification de votre parcours</li>
                  <li>Suivi de votre progression</li>
                </ul>
                <p className="text-muted">
                  Une approche responsable, conforme et orientée autonomie.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notre vision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-text leading-6">
                <p className="font-semibold text-navy">
                  Devenir une référence internationale en orientation stratégique vers le Canada.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted">
                  <li>Clarté des parcours</li>
                  <li>Responsabilisation des candidats</li>
                  <li>Innovation numérique</li>
                  <li>Intégrité des pratiques</li>
                  <li>Conformité administrative</li>
                </ul>
                <p className="text-muted">Un projet bien préparé est un projet plus durable.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Une approche hybride et moderne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text leading-6">
              <p>CAPITUNE combine :</p>
              <ul className="list-disc pl-5 space-y-1 text-muted">
                <li>Accompagnement humain (professionnels, conseillers, experts)</li>
                <li>Outils numériques intelligents</li>
                <li>Communauté encadrée et bienveillante</li>
                <li>Événements live, webinaires et formations</li>
                <li>Gestion centralisée des dossiers et documents</li>
              </ul>
              <p className="text-muted">
                Cette approche permet un accompagnement à la fois personnalisé et structuré,
                accessible à distance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Une communauté au cœur du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text leading-6">
              <p>CAPITUNE, c’est aussi une communauté active composée de :</p>
              <ul className="list-disc pl-5 space-y-1 text-muted">
                <li>Candidats à l’immigration, aux études ou à des projets professionnels</li>
                <li>Membres de la diaspora</li>
                <li>Jeunes professionnels et entrepreneurs</li>
                <li>Intervenants et partenaires spécialisés</li>
              </ul>
              <p className="text-muted">
                Les échanges sont encouragés dans un cadre respectueux, modéré et sans communication
                privée directe, afin de garantir la qualité des informations partagées.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transparence et conformité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text leading-6">
              <p>CAPITUNE adopte une approche claire et responsable :</p>
              <ul className="list-disc pl-5 space-y-1 text-muted">
                <li>Aucune promesse irréaliste</li>
                <li>Aucune garantie trompeuse</li>
                <li>Respect des cadres légaux et administratifs</li>
                <li>Protection des données et confidentialité des utilisateurs</li>
              </ul>
              <p className="text-muted">
                Nous informons, orientons et responsabilisons, sans créer de faux espoirs.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[92px] space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>À qui s’adresse CAPITUNE ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted">
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2">
                  Particuliers souhaitant étudier, travailler ou entreprendre au Canada
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2">
                  Membres de la diaspora
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2">
                  Jeunes professionnels et entrepreneurs
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2">
                  Institutions, organismes et partenaires internationaux
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CAPITUNE en quelques mots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted">
                <Item>Une plateforme claire</Item>
                <Item>Une communauté engagée</Item>
                <Item>Des outils concrets</Item>
                <Item>Une orientation responsable</Item>
                <Item>Une vision à long terme</Item>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2">
      <div className="text-xs font-semibold text-text">{children}</div>
      <div className="text-xs font-semibold text-navy">✔</div>
    </div>
  );
}
