import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

type ViewMode = "demandeur" | "professionnel";

type DemandeurTab = "apercu" | "documents" | "echanges" | "historique";
type ProTab =
  | "apercu"
  | "parcours"
  | "documents"
  | "echanges"
  | "notes"
  | "meetings"
  | "historique";

function normalizeDemandeurTab(tab: string | null | undefined): DemandeurTab {
  if (tab === "documents" || tab === "echanges" || tab === "historique") return tab;
  return "apercu";
}

function normalizeProTab(tab: string | null | undefined): ProTab {
  if (
    tab === "parcours" ||
    tab === "documents" ||
    tab === "echanges" ||
    tab === "notes" ||
    tab === "meetings" ||
    tab === "historique"
  ) {
    return tab;
  }
  return "apercu";
}

type GlobalStatusLabel =
  | "Préinscription"
  | "En analyse"
  | "En cours d’accompagnement"
  | "En attente d’éléments"
  | "Terminé"
  | "Suspendu"
  | "Local";

type PillIntent = "neutral" | "info" | "success" | "warning" | "danger";

type DocStatusLabel = "À fournir" | "En revue" | "Validé";

function pillStyles(intent: PillIntent) {
  switch (intent) {
    case "success":
      return "bg-success/15 text-navy border-success/25";
    case "info":
      return "bg-primary/12 text-navy border-primary/25";
    case "warning":
      return "bg-warning/15 text-navy border-warning/30";
    case "danger":
      return "bg-danger/12 text-danger border-danger/25";
    default:
      return "bg-white/60 text-text border-border";
  }
}

function StatusPill({ label, intent }: { label: string; intent: PillIntent }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${pillStyles(
        intent,
      )}`}
    >
      {label}
    </span>
  );
}

function docStatusLabel(status: string): DocStatusLabel {
  if (status === "VALIDE") return "Validé";
  if (status === "EN_REVUE") return "En revue";
  return "À fournir";
}

function docStatusIntent(label: DocStatusLabel): PillIntent {
  if (label === "Validé") return "success";
  if (label === "En revue") return "info";
  return "neutral";
}

function globalStatusIntent(label: GlobalStatusLabel): PillIntent {
  switch (label) {
    case "Terminé":
      return "success";
    case "En analyse":
      return "info";
    case "En cours d’accompagnement":
      return "success";
    case "En attente d’éléments":
      return "warning";
    case "Suspendu":
      return "danger";
    default:
      return "neutral";
  }
}

function resolveDemandeurGlobalStatus(args: {
  dossierStatus?: string | null;
  preRegistrationStatus?: string | null;
  reviewStatus?: string | null;
}): GlobalStatusLabel {
  const { dossierStatus, preRegistrationStatus, reviewStatus } = args;

  if (reviewStatus === "NEEDS_INFO") return "En attente d’éléments";
  if (reviewStatus === "NEW" || reviewStatus === "IN_REVIEW") return "En analyse";
  if (reviewStatus === "ACCEPTED") return "En cours d’accompagnement";
  if (reviewStatus === "REJECTED") return "Suspendu";

  if (preRegistrationStatus === "DRAFT" || preRegistrationStatus === "SUBMITTED") {
    return "Préinscription";
  }

  if (dossierStatus === "TERMINE") return "Terminé";
  if (dossierStatus === "EN_COURS") return "En cours d’accompagnement";
  if (dossierStatus === "PREINSCRIPTION") return "Préinscription";
  return "Local";
}

function Stepper({
  steps,
  currentIndex,
}: {
  steps: string[];
  currentIndex: number;
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {steps.map((s, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <li
            key={s}
            className={
              "rounded-[var(--radius-md)] border px-3 py-2 " +
              (done
                ? "border-success/25 bg-success/10"
                : active
                  ? "border-primary/25 bg-primary/10"
                  : "border-border bg-white/60")
            }
          >
            <div className="text-[11px] font-semibold text-muted">Étape {idx + 1}</div>
            <div className="text-sm font-medium text-text">{s}</div>
          </li>
        );
      })}
    </ol>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors " +
        (active
          ? "border-primary/25 bg-primary/12 text-navy"
          : "border-border bg-white/60 text-text hover:bg-white")
      }
    >
      {children}
    </Link>
  );
}

function parseViewMode(accountType: string): ViewMode {
  return accountType === "PROFESSIONAL" || accountType === "ADMIN"
    ? "professionnel"
    : "demandeur";
}

function deriveStepperIndex(status: GlobalStatusLabel) {
  const steps = [
    "Préinscription",
    "En analyse",
    "En cours",
    "En attente",
    "Terminé",
  ];
  if (status === "Préinscription") return { steps, index: 0 };
  if (status === "En analyse") return { steps, index: 1 };
  if (status === "En cours d’accompagnement") return { steps, index: 2 };
  if (status === "En attente d’éléments") return { steps, index: 3 };
  if (status === "Terminé") return { steps, index: 4 };
  if (status === "Suspendu") return { steps, index: 3 };
  return { steps, index: 0 };
}

export default async function MonDossierPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const params = (await searchParams) ?? {};
  const mode = parseViewMode(viewer.accountType);

  if (mode === "demandeur") {
    const tab = normalizeDemandeurTab(typeof params.tab === "string" ? params.tab : null);

    const [preRegistration, dossier] = await Promise.all([
      prisma.preRegistration.findUnique({
        where: { userId: viewer.id },
        include: {
          review: {
            include: {
              assignedPro: {
                select: { id: true, fullName: true, accountType: true, isCertified: true },
              },
            },
          },
        },
      }),
      prisma.dossier.findFirst({
        where: { userId: viewer.id },
        orderBy: { createdAt: "desc" },
        include: { documents: true },
      }),
    ]);

    const globalStatus = resolveDemandeurGlobalStatus({
      dossierStatus: dossier?.status ?? null,
      preRegistrationStatus: preRegistration?.status ?? null,
      reviewStatus: preRegistration?.review?.status ?? null,
    });

    const { steps, index } = deriveStepperIndex(globalStatus);

    const documents = (dossier?.documents ?? []).map((d) => {
      const label = docStatusLabel(d.status);
      return { id: d.id, name: d.name, status: label, intent: docStatusIntent(label), note: d.note };
    });

    const nextDoc = documents.find((d) => d.status === "À fournir") ?? null;
    const lastUpdatedAt =
      preRegistration?.updatedAt ?? dossier?.createdAt ?? new Date(0);

    const assignedPro = preRegistration?.review?.assignedPro ?? null;

    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Mon dossier</CardTitle>
                <CardDescription>
                  Suivi de votre progression et centralisation des éléments utiles.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={globalStatus} intent={globalStatusIntent(globalStatus)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Stepper steps={steps} currentIndex={index} />

            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
              Votre dossier est suivi par un professionnel. Les prochaines étapes vous seront communiquées ici.
            </div>

            <div className="flex flex-wrap gap-2">
              <TabLink href="/mon-dossier?tab=apercu" active={tab === "apercu"}>Aperçu</TabLink>
              <TabLink href="/mon-dossier?tab=documents" active={tab === "documents"}>Documents</TabLink>
              <TabLink href="/mon-dossier?tab=echanges" active={tab === "echanges"}>Échanges</TabLink>
              <TabLink href="/mon-dossier?tab=historique" active={tab === "historique"}>Historique</TabLink>
            </div>
          </CardContent>
        </Card>

        {tab === "apercu" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Aperçu</CardTitle>
                <CardDescription>Résumé clair, prochaine action, et suivi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                    <div className="text-xs text-muted">Résumé du projet</div>
                    <div className="mt-1 text-sm font-medium text-text">
                      {preRegistration?.mainObjective ? "Objectif: " + preRegistration.mainObjective : "À compléter"}
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                    <div className="text-xs text-muted">Dernière mise à jour</div>
                    <div className="mt-1 text-sm font-medium text-text">
                      {lastUpdatedAt.getTime() > 0 ? lastUpdatedAt.toLocaleDateString("fr-CA") : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                  <div className="text-xs text-muted">Professionnel en charge</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-navy">
                      {assignedPro?.fullName ?? "À assigner"}
                    </div>
                    {assignedPro?.isCertified ? (
                      <StatusPill label="Certifié" intent="success" />
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
                  <div className="text-sm font-semibold text-navy">Prochaine action</div>
                  <div className="mt-1 text-sm text-muted">
                    {nextDoc ? (
                      <>📌 Déposer : <span className="font-semibold text-text">{nextDoc.name}</span></>
                    ) : (
                      "Aucune action requise pour le moment."
                    )}
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" disabled>
                      Déposer le document
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rappels</CardTitle>
                <CardDescription>Cadre, transparence, et conformité.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-muted">
                  Toute information fournie doit être exacte et complète.
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-muted">
                  CAPITUNE ne garantit aucun résultat. Les décisions relèvent des autorités compétentes.
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "documents" ? (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Centraliser, simplifier, rassurer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Commentaire</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length === 0 ? (
                      <tr className="border-t border-border">
                        <td className="px-4 py-4 text-muted" colSpan={4}>
                          Aucun document pour le moment.
                        </td>
                      </tr>
                    ) : (
                      documents.map((d) => (
                        <tr key={d.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium text-text">{d.name}</td>
                          <td className="px-4 py-3">
                            <StatusPill label={d.status} intent={d.intent} />
                          </td>
                          <td className="px-4 py-3 text-muted">{d.note ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" disabled>
                                Déposer
                              </Button>
                              <Button size="sm" variant="ghost" disabled>
                                Télécharger
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {tab === "echanges" ? (
          <Card>
            <CardHeader>
              <CardTitle>Échanges</CardTitle>
              <CardDescription>Communication encadrée et tracée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
                Les échanges sont limités au cadre de votre dossier.
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
                Messagerie dossier (à brancher): messages, notifications importantes, pièces jointes autorisées, historique non modifiable.
              </div>
            </CardContent>
          </Card>
        ) : null}

        {tab === "historique" ? (
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Traçabilité des étapes et des actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted">
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                Préinscription: {preRegistration ? preRegistration.status : "—"}
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                Revue: {preRegistration?.review?.status ?? "—"}
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                Documents: {documents.length} élément(s)
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  // Vue professionnel
  const tab = normalizeProTab(typeof params.tab === "string" ? params.tab : null);
  const clientId = typeof params.clientId === "string" ? params.clientId : null;

  const assigned = await prisma.preRegistrationReview.findMany({
    where: { assignedProId: viewer.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      preRegistration: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  const fallbackClientId = assigned[0]?.preRegistration.user.id ?? null;
  const targetClientId = clientId ?? fallbackClientId;

  const [targetUser, targetPreReg, targetDossier, meetings] = targetClientId
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: targetClientId },
          select: { id: true, fullName: true, email: true },
        }),
        prisma.preRegistration.findUnique({
          where: { userId: targetClientId },
          include: { review: true },
        }),
        prisma.dossier.findFirst({
          where: { userId: targetClientId },
          orderBy: { createdAt: "desc" },
          include: { documents: true },
        }),
        prisma.meeting.findMany({
          where: { proId: viewer.id, clientId: targetClientId },
          orderBy: { startsAt: "desc" },
          take: 30,
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            startsAt: true,
            durationMin: true,
            locationUrl: true,
            notesInternal: true,
          },
        }),
      ])
    : [null, null, null, []];

  const globalStatus = resolveDemandeurGlobalStatus({
    dossierStatus: targetDossier?.status ?? null,
    preRegistrationStatus: targetPreReg?.status ?? null,
    reviewStatus: targetPreReg?.review?.status ?? null,
  });
  const { steps, index } = deriveStepperIndex(globalStatus);

  const targetDocuments = (targetDossier?.documents ?? []).map((d) => {
    const label = docStatusLabel(d.status);
    return { id: d.id, name: d.name, status: label, intent: docStatusIntent(label), note: d.note };
  });

  const missingDocs = targetDocuments.filter((d) => d.status === "À fournir").length;
  const pendingReviewDocs = targetDocuments.filter((d) => d.status === "En revue").length;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Mon dossier — Vue professionnel</CardTitle>
              <CardDescription>Gestion, conformité et traçabilité.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill label={globalStatus} intent={globalStatusIntent(globalStatus)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Client</div>
              <div className="mt-1 text-sm font-semibold text-navy">
                {targetUser?.fullName ?? "Aucun client assigné"}
              </div>
              <div className="text-sm text-muted">{targetUser?.email ?? "—"}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Type de projet</div>
              <div className="mt-1 text-sm font-medium text-text">
                {targetPreReg?.mainObjective ?? "—"}
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Urgence</div>
              <div className="mt-1 text-sm font-medium text-text">—</div>
            </div>
          </div>

          <Stepper steps={steps} currentIndex={index} />

          <div className="flex flex-wrap gap-2">
            <TabLink
              href={`/mon-dossier?tab=apercu${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "apercu"}
            >
              Aperçu
            </TabLink>
            <TabLink
              href={`/mon-dossier?tab=parcours${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "parcours"}
            >
              Parcours
            </TabLink>
            <TabLink
              href={`/mon-dossier?tab=documents${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "documents"}
            >
              Documents
            </TabLink>
            <TabLink
              href={`/mon-dossier?tab=echanges${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "echanges"}
            >
              Échanges
            </TabLink>
            <TabLink
              href={`/mon-dossier?tab=notes${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "notes"}
            >
              Notes internes
            </TabLink>
            <TabLink
              href={`/mon-dossier?tab=meetings${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "meetings"}
            >
              Meetings
            </TabLink>
            <TabLink
              href={`/mon-dossier?tab=historique${targetClientId ? `&clientId=${targetClientId}` : ""}`}
              active={tab === "historique"}
            >
              Historique
            </TabLink>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled>
              Demander un document
            </Button>
            <Button size="sm" variant="outline" disabled>
              Programmer un meeting
            </Button>
            <Button size="sm" variant="outline" disabled>
              Ajouter une note interne
            </Button>
          </div>
        </CardContent>
      </Card>

      {tab === "apercu" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
              <CardDescription>Vue gestion: alertes, prochaine action, synthèse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                  <div className="text-xs text-muted">Documents manquants</div>
                  <div className="mt-1 text-sm font-semibold text-navy">{missingDocs}</div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                  <div className="text-xs text-muted">Docs en revue</div>
                  <div className="mt-1 text-sm font-semibold text-navy">{pendingReviewDocs}</div>
                </div>
              </div>

              <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
                <div className="text-sm font-semibold text-navy">Prochaine action recommandée</div>
                <div className="mt-1 text-sm text-muted">
                  {missingDocs > 0 ? "Demander les documents manquants et fixer une échéance." : "Aucune action urgente détectée."}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clients assignés</CardTitle>
              <CardDescription>Sélection rapide.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {assigned.length === 0 ? (
                <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
                  Aucun dossier assigné pour le moment.
                </div>
              ) : (
                assigned.map((r) => (
                  <Link
                    key={r.preRegistration.user.id}
                    href={`/mon-dossier?tab=${tab}&clientId=${r.preRegistration.user.id}`}
                    className={
                      "block rounded-[var(--radius-md)] border p-3 text-sm transition-colors " +
                      (r.preRegistration.user.id === targetClientId
                        ? "border-primary/25 bg-primary/10"
                        : "border-border bg-white/60 hover:bg-white")
                    }
                  >
                    <div className="font-semibold text-navy">{r.preRegistration.user.fullName}</div>
                    <div className="text-muted">{r.status}</div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "parcours" ? (
        <Card>
          <CardHeader>
            <CardTitle>Parcours</CardTitle>
            <CardDescription>Pilotage du dossier (validation/pause/étape suivante à brancher).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Historique des changements d’étape (à implémenter) + actions de pilotage.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled>
                Valider l’étape
              </Button>
              <Button size="sm" variant="outline" disabled>
                Mettre en pause
              </Button>
              <Button size="sm" disabled>
                Passer à l’étape suivante
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "documents" ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Contrôle, conformité et versioning.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-xs text-muted">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Commentaire visible client</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targetDocuments.length === 0 ? (
                    <tr className="border-t border-border">
                      <td className="px-4 py-4 text-muted" colSpan={4}>
                        Aucun document pour ce client.
                      </td>
                    </tr>
                  ) : (
                    targetDocuments.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-text">{d.name}</td>
                        <td className="px-4 py-3">
                          <StatusPill label={d.status} intent={d.intent} />
                        </td>
                        <td className="px-4 py-3 text-muted">{d.note ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled>
                              Valider
                            </Button>
                            <Button size="sm" variant="outline" disabled>
                              Refuser
                            </Button>
                            <Button size="sm" variant="ghost" disabled>
                              Télécharger
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "echanges" ? (
        <Card>
          <CardHeader>
            <CardTitle>Échanges</CardTitle>
            <CardDescription>Client ↔ pro, historique complet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Messagerie dossier à brancher (et rappels envoyés).
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "notes" ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes internes</CardTitle>
            <CardDescription>Privé, jamais visible par le demandeur.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Notes internes (observations, risques, décisions) à implémenter.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "meetings" ? (
        <Card>
          <CardHeader>
            <CardTitle>Meetings</CardTitle>
            <CardDescription>Coordination et suivi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {meetings.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
                Aucun meeting pour ce client.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-xs text-muted">
                      <th className="px-4 py-3">Titre</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Lien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-text">{m.title}</td>
                        <td className="px-4 py-3 text-muted">{m.status}</td>
                        <td className="px-4 py-3 text-muted">
                          {m.startsAt.toLocaleString("fr-CA")}
                        </td>
                        <td className="px-4 py-3">
                          {m.locationUrl ? (
                            <a
                              className="text-sm font-semibold text-primary underline"
                              href={m.locationUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir
                            </a>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "historique" ? (
        <Card>
          <CardHeader>
            <CardTitle>Historique & conformité</CardTitle>
            <CardDescription>Timeline complète (auditabilité à implémenter).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
              Actions utilisateur / actions pro / justificatifs (à brancher).
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4 text-sm text-muted">
        CAPITUNE ne garantit aucun résultat. Les décisions relèvent des autorités compétentes.
      </div>
    </div>
  );
}
