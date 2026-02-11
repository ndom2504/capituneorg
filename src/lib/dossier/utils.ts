
export type GlobalStatusLabel =
  | "Préinscription"
  | "En analyse"
  | "En cours d’accompagnement"
  | "En attente d’éléments"
  | "Terminé"
  | "Suspendu"
  | "Local";

export type PillIntent = "neutral" | "info" | "success" | "warning" | "danger";

export type DocStatusLabel = "À fournir" | "En revue" | "Validé";

export function pillStyles(intent: PillIntent) {
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

export function docStatusLabel(status: string): DocStatusLabel {
  if (status === "VALIDE") return "Validé";
  if (status === "EN_REVUE") return "En revue";
  return "À fournir";
}

export function docStatusIntent(label: DocStatusLabel): PillIntent {
  if (label === "Validé") return "success";
  if (label === "En revue") return "info";
  return "neutral";
}

export function globalStatusIntent(label: GlobalStatusLabel): PillIntent {
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

export function resolveDemandeurGlobalStatus(args: {
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

export function deriveStepperIndex(status: GlobalStatusLabel) {
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
