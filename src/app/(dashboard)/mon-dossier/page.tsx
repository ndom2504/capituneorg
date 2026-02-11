import { Button, getButtonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";
import { docStatusLabel } from "@/lib/dossier/utils";
import { StatusPill } from "@/components/dossier/status-pill";
import { DocumentUploadButton } from "@/components/dossier/document-upload-button";
import RegistrationWizard, { LocalPreReg } from "@/components/dossier/registration-wizard";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MonDossierPage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

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

  const documents = (dossier?.documents ?? []).map((d) => {
    return { id: d.id, name: d.name, status: docStatusLabel(d.status) };
  });

  const nextDoc = documents.find((d) => d.status === "À fournir") ?? null;
  const lastUpdatedAt = preRegistration?.updatedAt ?? dossier?.createdAt ?? new Date(0);
  const assignedPro = preRegistration?.review?.assignedPro ?? null;

  // Determine global state
  const isPreRegComplete = preRegistration?.status === "SUBMITTED";
  const hasDossier = !!dossier;

  if (!preRegistration || preRegistration.status === "DRAFT") {
    return <RegistrationWizard initialData={preRegistration as unknown as LocalPreReg | null} />;
  }

  let actionTitle = "Aucune action requise";
  let actionDescription = "Votre dossier est à jour.";
  let actionButton = <Button variant="outline" disabled>Rien à faire</Button>;

  if (!hasDossier) {
      actionTitle = "En attente d'analyse";
      actionDescription = "Votre préinscription a été reçue. Un conseiller va bientôt créer votre dossier.";
      actionButton = <Button variant="outline" disabled>En attente</Button>;
  } else if (nextDoc) {
      actionTitle = "Document à fournir";
      actionDescription = `Vous devez déposer le document : ${nextDoc.name}`;
      actionButton = <DocumentUploadButton docId={nextDoc.id} status={nextDoc.status} variant="default" label="Déposer maintenant" />;
  }

  return (
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
                {lastUpdatedAt.getTime() > 0 ? lastUpdatedAt.toLocaleDateString("fr-CA") : "Jamais"}
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
              {actionTitle === "Document à fournir" ? (
                  <>Déposer : <span className="font-semibold text-text">{nextDoc?.name}</span></>
              ) : (
                  actionDescription
              )}
            </div>
            <div className="mt-3">
              {actionButton}
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
  );
}
