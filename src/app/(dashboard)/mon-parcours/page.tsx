"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NEEDS, type NeedId, isNeedId, needLabel } from "@/lib/taxonomy";
import { cn } from "@/lib/cn";

type GlobalStep = 1 | 2 | 3 | 4;

type PreRegistrationStatus = "DRAFT" | "SUBMITTED";

type PreinscriptionPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  language?: "FRANCAIS" | "ANGLAIS" | "AUTRE";

  countryOfResidence?: string;
  city?: string;
  nationality?: string;
  residenceSituation?: "PAYS_ORIGINE" | "ETRANGER_ETUDES_TRAVAIL" | "TEMPORAIRE";

  mainObjective?: "ETUDIER" | "TRAVAILLER" | "ENTREPRENDRE" | "FAMILLE" | "EXPLORER";
  needs?: string[];

  professionalSituation?: "ETUDIANT" | "SALARIE" | "ENTREPRENEUR" | "SANS_EMPLOI";
  domain?: "TECH" | "SANTE" | "COMMERCE_GESTION" | "INGENIERIE" | "TECHNIQUE" | "AUTRE";
  educationLevel?: "SECONDAIRE" | "BAC_LICENCE" | "MASTER" | "DOCTORAT" | "AUTRE";
  experienceRange?: "ZERO_UN" | "DEUX_QUATRE" | "CINQ_PLUS";

  budgetRange?:
    | "MOINS_3000"
    | "ENTRE_3000_7000"
    | "ENTRE_7000_15000"
    | "PLUS_15000"
    | "JE_NE_SAIS_PAS";

  constraints?: string[];
  constraintsOther?: string;
  message?: string;

  disclaimerAccepted?: boolean;
  contactAccepted?: boolean;
};

type FieldErrors = Record<string, string>;

type LocalPreReg = PreinscriptionPayload & {
  status?: PreRegistrationStatus;
  updatedAt?: string;
};

type SubStep = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
const SUB_STEPS: Array<{ key: SubStep; label: string }> = [
  { key: "A", label: "Coordonnées" },
  { key: "B", label: "Localisation" },
  { key: "C", label: "Objectif" },
  { key: "D", label: "Besoins" },
  { key: "E", label: "Profil" },
  { key: "F", label: "Budget & contraintes" },
  { key: "G", label: "Message" },
  { key: "H", label: "Validation" },
];

const LANGUAGES = ["FRANCAIS", "ANGLAIS", "AUTRE"] as const;
const RESIDENCE_SITUATIONS = [
  "PAYS_ORIGINE",
  "ETRANGER_ETUDES_TRAVAIL",
  "TEMPORAIRE",
] as const;
const MAIN_OBJECTIVES = [
  "ETUDIER",
  "TRAVAILLER",
  "ENTREPRENDRE",
  "FAMILLE",
  "EXPLORER",
] as const;
const PROFESSIONAL_SITUATIONS = [
  "ETUDIANT",
  "SALARIE",
  "ENTREPRENEUR",
  "SANS_EMPLOI",
] as const;
const DOMAINS = [
  "TECH",
  "SANTE",
  "COMMERCE_GESTION",
  "INGENIERIE",
  "TECHNIQUE",
  "AUTRE",
] as const;
const EDUCATION_LEVELS = [
  "SECONDAIRE",
  "BAC_LICENCE",
  "MASTER",
  "DOCTORAT",
  "AUTRE",
] as const;
const EXPERIENCE_RANGES = ["ZERO_UN", "DEUX_QUATRE", "CINQ_PLUS"] as const;
const BUDGET_RANGES = [
  "MOINS_3000",
  "ENTRE_3000_7000",
  "ENTRE_7000_15000",
  "PLUS_15000",
  "JE_NE_SAIS_PAS",
] as const;

function oneOf<const T extends readonly string[]>(
  values: T,
  v: string,
): T[number] | undefined {
  return (values as readonly string[]).includes(v) ? (v as T[number]) : undefined;
}

type BudgetLine = {
  key: string;
  label: string;
  minCad: number;
  maxCad: number;
  note?: string;
  category:
    | "Consultation"
    | "Gouvernement"
    | "Documents"
    | "Tests"
    | "Voyage"
    | "Installation"
    | "Optionnel";
};

type BudgetEstimatorOptions = {
  travelers: number;
  targetProvince: "QC" | "AUTRE";
  accommodationWeeks: number;
  flight: "NONE" | "ONE_WAY" | "ROUND_TRIP";
  includeMedical: boolean;
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function cad(n: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

function sumRange(lines: BudgetLine[]) {
  return lines.reduce(
    (acc, l) => ({ min: acc.min + l.minCad, max: acc.max + l.maxCad }),
    { min: 0, max: 0 },
  );
}

function budgetRangeLimit(range?: PreinscriptionPayload["budgetRange"]) {
  switch (range) {
    case "MOINS_3000":
      return 3000;
    case "ENTRE_3000_7000":
      return 7000;
    case "ENTRE_7000_15000":
      return 15000;
    case "PLUS_15000":
      return 999999;
    default:
      return undefined;
  }
}

function estimateBudget(
  form: PreinscriptionPayload,
  options?: Partial<BudgetEstimatorOptions>,
): BudgetLine[] {
  const travelers = clampInt(options?.travelers ?? 1, 1, 8);
  const targetProvince: BudgetEstimatorOptions["targetProvince"] =
    options?.targetProvince ?? (form.mainObjective === "ETUDIER" ? "QC" : "AUTRE");
  const accommodationWeeks = clampInt(options?.accommodationWeeks ?? 3, 1, 12);
  const flight: BudgetEstimatorOptions["flight"] = options?.flight ?? "ONE_WAY";
  const includeMedical = !!options?.includeMedical;

  const lines: BudgetLine[] = [];

  lines.push({
    key: "consultation",
    label: "Consultation / évaluation CAPITUNE",
    minCad: 75,
    maxCad: 250,
    note: "Varie selon la durée et le niveau d’analyse.",
    category: "Consultation",
  });

  lines.push({
    key: "traductions",
    label: "Traductions certifiées + copies conformes",
    minCad: 150,
    maxCad: 650,
    note: "Dépend du nombre de documents.",
    category: "Documents",
  });
  lines.push({
    key: "photos",
    label: "Photos d’identité + impressions",
    minCad: 20,
    maxCad: 60,
    category: "Documents",
  });
  lines.push({
    key: "police",
    label: "Certificats de police (si requis)",
    minCad: 0,
    maxCad: 120,
    category: "Documents",
  });

  lines.push({
    key: "biometrics",
    label: "Biométrie (empreintes + photo)",
    minCad: 85 * travelers,
    maxCad: 85 * travelers,
    note: travelers > 1 ? `≈ ${travelers} personne(s)` : undefined,
    category: "Gouvernement",
  });
  if (includeMedical) {
    lines.push({
      key: "medical",
      label: "Examen médical (si requis)",
      minCad: 200 * travelers,
      maxCad: 450 * travelers,
      note: travelers > 1 ? `≈ ${travelers} personne(s)` : undefined,
      category: "Tests",
    });
  }

  const needsEnglishTest =
    (form.mainObjective === "TRAVAILLER" || form.mainObjective === "ETUDIER") &&
    (form.language === "ANGLAIS" || form.language === "AUTRE");
  if (needsEnglishTest) {
    lines.push({
      key: "language-test",
      label: "Test de langue (IELTS / CELPIP / autre)",
      minCad: 250,
      maxCad: 420,
      category: "Tests",
    });
  }

  const needsEca =
    (form.mainObjective === "TRAVAILLER" || form.mainObjective === "EXPLORER") &&
    (form.educationLevel === "BAC_LICENCE" ||
      form.educationLevel === "MASTER" ||
      form.educationLevel === "DOCTORAT");
  if (needsEca) {
    lines.push({
      key: "eca",
      label: "Évaluation des diplômes (ECA) (si requis)",
      minCad: 0,
      maxCad: 300,
      category: "Tests",
    });
  }

  switch (form.mainObjective) {
    case "ETUDIER": {
      if (targetProvince === "QC") {
        lines.push({
          key: "caq",
          label: "CAQ (Québec) — frais de demande",
          minCad: 128,
          maxCad: 128,
          category: "Gouvernement",
        });
      } else {
        lines.push({
          key: "prov-study",
          label: "Frais provinciaux liés aux études (si applicable)",
          minCad: 0,
          maxCad: 200,
          note: "Certaines provinces n’en demandent pas.",
          category: "Gouvernement",
        });
      }
      lines.push({
        key: "study-permit",
        label: "Permis d’études — frais de demande",
        minCad: 150,
        maxCad: 150,
        category: "Gouvernement",
      });
      lines.push({
        key: "school-deposit",
        label: "Frais d’inscription / acompte établissement",
        minCad: 0,
        maxCad: 3000,
        note: "Très variable selon le programme.",
        category: "Optionnel",
      });
      break;
    }
    case "TRAVAILLER": {
      lines.push({
        key: "work-permit",
        label: "Permis de travail — frais de demande",
        minCad: 155,
        maxCad: 255,
        note: "Selon le type (ouvert/fermé).",
        category: "Gouvernement",
      });
      lines.push({
        key: "employer-fees",
        label: "Frais liés à l’employeur (LMIA / conformité) (si applicable)",
        minCad: 0,
        maxCad: 1500,
        note: "Certains parcours n’en ont pas besoin.",
        category: "Optionnel",
      });
      break;
    }
    case "ENTREPRENDRE": {
      lines.push({
        key: "business",
        label: "Étude de projet / plan d’affaires / formalités",
        minCad: 300,
        maxCad: 3000,
        note: "Dépend du montage et des besoins juridiques.",
        category: "Consultation",
      });
      break;
    }
    case "FAMILLE": {
      lines.push({
        key: "sponsorship",
        label: "Parrainage (frais gouvernementaux) (si applicable)",
        minCad: 0,
        maxCad: 1200,
        note: "Très variable selon le type de demande.",
        category: "Gouvernement",
      });
      break;
    }
    case "EXPLORER":
    default:
      break;
  }

  if (form.residenceSituation === "ETRANGER_ETUDES_TRAVAIL") {
    lines.push({
      key: "status-proof",
      label: "Documents de statut à l’étranger (preuves / attestations)",
      minCad: 0,
      maxCad: 80,
      category: "Documents",
    });
  }
  if ((form.constraints ?? []).includes("DELAIS_COURTS")) {
    lines.push({
      key: "express",
      label: "Services express / envois (si nécessaire)",
      minCad: 0,
      maxCad: 120,
      category: "Optionnel",
    });
  }

  if (flight !== "NONE") {
    const perPerson =
      flight === "ROUND_TRIP"
        ? { min: 1200, max: 2600, label: "Billets d’avion (aller-retour)" }
        : { min: 700, max: 1800, label: "Billets d’avion (aller)" };

    lines.push({
      key: "flight",
      label: `${perPerson.label} (ordre de grandeur)`,
      minCad: perPerson.min * travelers,
      maxCad: perPerson.max * travelers,
      note: travelers > 1 ? `≈ ${travelers} personne(s)` : undefined,
      category: "Voyage",
    });
  }

  const accommodationPerWeek = { min: 450, max: 875 };
  lines.push({
    key: "accommodation",
    label: "Hébergement temporaire (ordre de grandeur)",
    minCad: accommodationPerWeek.min * accommodationWeeks,
    maxCad: accommodationPerWeek.max * accommodationWeeks,
    note: `${accommodationWeeks} semaine(s) (≈ ${cad(accommodationPerWeek.min)}–${cad(accommodationPerWeek.max)}/semaine)`,
    category: "Installation",
  });
  lines.push({
    key: "transport",
    label: "Transport local + premiers achats (ordre de grandeur)",
    minCad: 200 + Math.max(0, travelers - 1) * 50,
    maxCad: 900 + Math.max(0, travelers - 1) * 200,
    category: "Installation",
  });
  lines.push({
    key: "buffer",
    label: "Marge de sécurité / imprévus",
    minCad: 300 + (accommodationWeeks - 1) * 40 + Math.max(0, travelers - 1) * 150,
    maxCad: 1200 + (accommodationWeeks - 1) * 100 + Math.max(0, travelers - 1) * 400,
    category: "Installation",
  });

  return lines;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-red-600">{message}</div>;
}

function BudgetEstimatorDialog({
  open,
  onClose,
  form,
}: {
  open: boolean;
  onClose: () => void;
  form: PreinscriptionPayload;
}) {
  const defaultProvince: BudgetEstimatorOptions["targetProvince"] =
    form.mainObjective === "ETUDIER" ? "QC" : "AUTRE";

  const [travelers, setTravelers] = React.useState(1);
  const [targetProvince, setTargetProvince] = React.useState<
    BudgetEstimatorOptions["targetProvince"]
  >(defaultProvince);
  const [accommodationWeeks, setAccommodationWeeks] = React.useState(3);
  const [flight, setFlight] = React.useState<BudgetEstimatorOptions["flight"]>("ONE_WAY");
  const defaultIncludeMedical =
    form.mainObjective === "ETUDIER" || form.mainObjective === "TRAVAILLER";
  const [includeMedical, setIncludeMedical] = React.useState<boolean>(defaultIncludeMedical);

  React.useEffect(() => {
    if (!open) return;
    setTargetProvince(defaultProvince);
    setTravelers(1);
    setAccommodationWeeks(3);
    setFlight("ONE_WAY");
    setIncludeMedical(defaultIncludeMedical);
  }, [open, defaultProvince, defaultIncludeMedical]);

  if (!open) return null;

  const lines = estimateBudget(form, {
    travelers,
    targetProvince,
    accommodationWeeks,
    flight,
    includeMedical,
  });
  const totals = sumRange(lines);
  const totalsNoFlight = sumRange(lines.filter((l) => l.key !== "flight"));
  const limit = budgetRangeLimit(form.budgetRange);

  const grouped = lines.reduce<Record<string, BudgetLine[]>>((acc, line) => {
    (acc[line.category] ??= []).push(line);
    return acc;
  }, {});

  const copyText = async () => {
    const header = `Estimation budget CAPITUNE (indicative)\nObjectif: ${form.mainObjective ?? "—"}\nProvince visée: ${targetProvince === "QC" ? "Québec" : "Autre"}\nPersonnes: ${travelers}\nHébergement temporaire: ${accommodationWeeks} semaine(s)\nVol: ${flight === "NONE" ? "Exclu" : flight === "ROUND_TRIP" ? "Aller-retour" : "Aller"}\n`;
    const body = lines
      .map(
        (l) =>
          `- ${l.label}: ${cad(l.minCad)} – ${cad(l.maxCad)}${l.note ? ` (${l.note})` : ""}`,
      )
      .join("\n");
    const footer = `\n\nTotal estimé: ${cad(totals.min)} – ${cad(totals.max)}\nTotal hors vol: ${cad(totalsNoFlight.min)} – ${cad(totalsNoFlight.max)}\n`;
    await navigator.clipboard.writeText(`${header}${body}${footer}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Estimation de budget (indicative)</CardTitle>
                <CardDescription>
                  Vue d’ensemble des frais possibles selon votre projet. Ce n’est pas un devis officiel.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/50 p-3">
              <div className="text-sm font-semibold text-navy">Total estimé</div>
              <div className="mt-1 text-lg font-semibold text-text">
                {cad(totals.min)} – {cad(totals.max)}
              </div>
              {lines.some((l) => l.key === "flight") ? (
                <div className="mt-1 text-sm text-muted">
                  Total hors vol: {cad(totalsNoFlight.min)} – {cad(totalsNoFlight.max)}
                </div>
              ) : null}
              {typeof limit === "number" && limit < 999999 ? (
                <div className="mt-1 text-sm text-muted">
                  Budget déclaré (hors billets d’avion): ≤ {cad(limit)}
                  {totalsNoFlight.max > limit ? (
                    <span className="text-red-700">  risque de dépassement</span>
                  ) : (
                    <span className="text-green-700">  cohérent</span>
                  )}
                </div>
              ) : null}
            </div>

            <div className="rounded-[var(--radius-md)] border border-border bg-white/50 p-3">
              <div className="text-sm font-semibold text-navy">Paramètres</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted">Province visée</div>
                  <SelectField
                    value={targetProvince}
                    onChange={(v) => setTargetProvince(v === "QC" ? "QC" : "AUTRE")}
                  >
                    <option value="QC">Québec</option>
                    <option value="AUTRE">Autre province/territoire</option>
                  </SelectField>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted">Nombre de personnes</div>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={travelers}
                    onChange={(e) => setTravelers(clampInt(Number(e.target.value), 1, 8))}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted">Hébergement temporaire (semaines)</div>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={accommodationWeeks}
                    onChange={(e) =>
                      setAccommodationWeeks(clampInt(Number(e.target.value), 1, 12))
                    }
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted">Billets d’avion</div>
                  <SelectField
                    value={flight}
                    onChange={(v) => {
                      if (v === "NONE" || v === "ONE_WAY" || v === "ROUND_TRIP") setFlight(v);
                    }}
                  >
                    <option value="ONE_WAY">Aller</option>
                    <option value="ROUND_TRIP">Aller-retour</option>
                    <option value="NONE">Exclure du total</option>
                  </SelectField>
                </div>
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <Checkbox checked={includeMedical} onChange={setIncludeMedical} />
                <span>Inclure une estimation d’examen médical (si requis)</span>
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="sm" variant="outline" onClick={() => void copyText().catch(() => null)}>
                Copier l’estimation
              </Button>
              <div className="text-xs text-muted sm:self-center">
                Ajustez les paramètres ci-dessus pour affiner.
              </div>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-auto pr-1">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <div className="text-sm font-semibold text-navy">{cat}</div>
                  <div className="grid gap-2">
                    {items.map((l) => (
                      <div
                        key={l.key}
                        className="rounded-[var(--radius-md)] border border-border bg-white/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-medium text-text">{l.label}</div>
                          <div className="whitespace-nowrap text-sm font-semibold text-text">
                            {cad(l.minCad)}  {cad(l.maxCad)}
                          </div>
                        </div>
                        {l.note ? <div className="mt-1 text-xs text-muted">{l.note}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted">
              Remarque: les montants varient selon pays, délais, type de demande et situation familiale.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MonParcoursPage() {
  const currentGlobalStep: GlobalStep = 1;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-4">
        <div className="text-sm font-semibold text-navy">Mon parcours</div>
        <div className="mt-1 text-sm text-muted">
          Avancez étape par étape, sans pression. Aucune promesse, aucun jargon.
        </div>
        <div className="mt-3 text-sm">
          <span className="font-semibold text-navy">Étape actuelle :</span>{" "}
          <span className="text-text">Préinscription</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <StepperCard current={currentGlobalStep} />
        <PreinscriptionWizard />
      </div>
    </div>
  );
}

function StepperCard({ current }: { current: GlobalStep }) {
  const steps: Array<{ n: GlobalStep; title: string; desc: string }> = [
    {
      n: 1,
      title: "Préinscription",
      desc: "Présentation du projet + informations essentielles.",
    },
    {
      n: 2,
      title: "Analyse & orientation",
      desc: "Système + admin (à venir).",
    },
    {
      n: 3,
      title: "Inscription complète",
      desc: "Accès à laccompagnement (à venir).",
    },
    {
      n: 4,
      title: "Dossier & accompagnement",
      desc: "Documents, suivi et échanges (à venir).",
    },
  ];

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Étapes</CardTitle>
        <CardDescription>Progression claire et réaliste.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s) => {
          const isActive = s.n === current;
          const isDone = s.n < current;
          return (
            <div
              key={s.n}
              className={cn(
                "rounded-[var(--radius-md)] border p-3",
                isActive
                  ? "border-primary/25 bg-primary/12"
                  : "border-border bg-white/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-navy">
                  {s.n}. {s.title}
                </div>
                <div
                  className={cn(
                    "text-xs",
                    isDone ? "text-green-700" : isActive ? "text-navy" : "text-muted",
                  )}
                >
                  {isDone ? "Terminé" : isActive ? "En cours" : "À venir"}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted">{s.desc}</div>
            </div>
          );
        })}
        <div className="pt-2 text-xs text-muted">Vous pouvez sauvegarder et revenir plus tard.</div>
      </CardContent>
    </Card>
  );
}

function SelectField({
  value,
  onChange,
  children,
  required,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className={cn(
        "h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {children}
    </select>
  );
}

function Checkbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="h-4 w-4 rounded border-border"
    />
  );
}

function MultiChoice({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => {
        const checked = value.includes(o.value);
        return (
          <label
            key={o.value}
            className={cn(
              "flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-white/50 p-2 text-sm",
              disabled ? "opacity-60" : "hover:bg-white/70",
            )}
          >
            <Checkbox
              checked={checked}
              onChange={(v) => {
                if (v) onChange([...value, o.value]);
                else onChange(value.filter((x) => x !== o.value));
              }}
              disabled={disabled}
            />
            <span className="pt-0.5">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => {
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-white/50 p-2 text-sm",
              disabled ? "opacity-60" : "hover:bg-white/70",
            )}
          >
            <input
              type="radio"
              name="radio"
              checked={checked}
              onChange={() => onChange(o.value)}
              disabled={disabled}
              className="mt-1 h-4 w-4"
            />
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function PreinscriptionWizard() {
  const [subStep, setSubStep] = React.useState<SubStep>("A");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<PreRegistrationStatus | null>(null);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [showBudget, setShowBudget] = React.useState(false);

  const [form, setForm] = React.useState<PreinscriptionPayload>({
    needs: [],
    constraints: [],
    disclaimerAccepted: false,
    contactAccepted: false,
  });

  const isSubmitted = status === "SUBMITTED";

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/preinscription", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Impossible de charger la préinscription");
        return (await r.json()) as { preRegistration: LocalPreReg | null };
      })
      .then((data) => {
        if (cancelled) return;
        if (data.preRegistration) {
          const pre = data.preRegistration;
          setStatus(pre.status ?? null);
          setSavedAt(pre.updatedAt ?? null);
          setForm({
            firstName: pre.firstName ?? "",
            lastName: pre.lastName ?? "",
            email: pre.email ?? "",
            phone: pre.phone ?? "",
            language: pre.language,
            countryOfResidence: pre.countryOfResidence ?? "",
            city: pre.city ?? "",
            nationality: pre.nationality ?? "",
            residenceSituation: pre.residenceSituation,
            mainObjective: pre.mainObjective,
            needs: pre.needs ?? [],
            professionalSituation: pre.professionalSituation,
            domain: pre.domain,
            educationLevel: pre.educationLevel,
            experienceRange: pre.experienceRange,
            budgetRange: pre.budgetRange,
            constraints: pre.constraints ?? [],
            constraintsOther: pre.constraintsOther ?? "",
            message: pre.message ?? "",
            disclaimerAccepted: !!pre.disclaimerAccepted,
            contactAccepted: !!pre.contactAccepted,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setNotice("Erreur de chargement. Réessayez.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof PreinscriptionPayload>(key: K, value: PreinscriptionPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    const idx = SUB_STEPS.findIndex((s) => s.key === subStep);
    if (idx < SUB_STEPS.length - 1) setSubStep(SUB_STEPS[idx + 1].key);
  }
  function goPrev() {
    const idx = SUB_STEPS.findIndex((s) => s.key === subStep);
    if (idx > 0) setSubStep(SUB_STEPS[idx - 1].key);
  }

  async function save(mode: "draft" | "submit") {
    setNotice(null);
    setFieldErrors({});
    setSaving(true);

    const res = await fetch("/api/preinscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, payload: form }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string; fieldErrors?: FieldErrors }
        | null;
      if (data?.fieldErrors) setFieldErrors(data.fieldErrors);
      setNotice(
        data?.error === "Validation"
          ? "Merci de compléter les champs requis."
          : "Action impossible.",
      );
      setSaving(false);
      return;
    }

    const data = (await res.json()) as { status: PreRegistrationStatus; updatedAt: string };
    setStatus(data.status);
    setSavedAt(data.updatedAt);
    setNotice(mode === "submit" ? "Préinscription envoyée." : "Brouillon sauvegardé.");
    setSaving(false);
  }

  const stepLabel = SUB_STEPS.find((s) => s.key === subStep)?.label ?? "";
  const stepIndex = SUB_STEPS.findIndex((s) => s.key === subStep) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préinscription</CardTitle>
        <CardDescription>
          {stepLabel}  étape {stepIndex}/8
          {savedAt ? (
            <span className="ml-2"> Dernière sauvegarde: {new Date(savedAt).toLocaleString("fr-CA")}</span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BudgetEstimatorDialog open={showBudget} onClose={() => setShowBudget(false)} form={form} />

        {notice ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-white/50 p-3 text-sm text-muted">
            {notice}
          </div>
        ) : null}

        {isSubmitted ? (
          <div className="rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Préinscription reçue. Nous reviendrons vers vous.
            <div className="mt-3">
              <Button disabled size="sm" variant="outline">
                Passer à linscription (à venir)
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted">Chargement</div>
        ) : (
          <div className="space-y-4">
            {subStep === "A" ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Input
                      placeholder="Prénom *"
                      value={form.firstName ?? ""}
                      onChange={(e) => set("firstName", e.target.value)}
                      disabled={saving || isSubmitted}
                    />
                    <FieldError message={fieldErrors.firstName} />
                  </div>
                  <div>
                    <Input
                      placeholder="Nom *"
                      value={form.lastName ?? ""}
                      onChange={(e) => set("lastName", e.target.value)}
                      disabled={saving || isSubmitted}
                    />
                    <FieldError message={fieldErrors.lastName} />
                  </div>
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value)}
                    disabled={saving || isSubmitted}
                  />
                  <FieldError message={fieldErrors.email} />
                </div>
                <Input
                  placeholder="Téléphone (optionnel)"
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  disabled={saving || isSubmitted}
                />
                <div>
                  <SelectField
                    value={form.language ?? ""}
                    onChange={(v) => set("language", oneOf(LANGUAGES, v))}
                    disabled={saving || isSubmitted}
                  >
                    <option value="">Langue de communication préférée *</option>
                    <option value="FRANCAIS">Français</option>
                    <option value="ANGLAIS">Anglais</option>
                    <option value="AUTRE">Autre</option>
                  </SelectField>
                  <FieldError message={fieldErrors.language} />
                </div>
              </div>
            ) : null}

            {subStep === "B" ? (
              <div className="space-y-3">
                <div>
                  <Input
                    placeholder="Pays de résidence actuelle *"
                    value={form.countryOfResidence ?? ""}
                    onChange={(e) => set("countryOfResidence", e.target.value)}
                    disabled={saving || isSubmitted}
                  />
                  <FieldError message={fieldErrors.countryOfResidence} />
                </div>
                <Input
                  placeholder="Ville (optionnel)"
                  value={form.city ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                  disabled={saving || isSubmitted}
                />
                <div>
                  <Input
                    placeholder="Nationalité *"
                    value={form.nationality ?? ""}
                    onChange={(e) => set("nationality", e.target.value)}
                    disabled={saving || isSubmitted}
                  />
                  <FieldError message={fieldErrors.nationality} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-navy">Êtes-vous actuellement *</div>
                  <RadioGroup
                    value={form.residenceSituation ?? ""}
                    onChange={(v) => set("residenceSituation", oneOf(RESIDENCE_SITUATIONS, v))}
                    disabled={saving || isSubmitted}
                    options={[
                      { value: "PAYS_ORIGINE", label: "Dans votre pays dorigine" },
                      { value: "ETRANGER_ETUDES_TRAVAIL", label: "À létranger (études / travail)" },
                      { value: "TEMPORAIRE", label: "En situation temporaire" },
                    ]}
                  />
                  <FieldError message={fieldErrors.residenceSituation} />
                  <div className="text-xs text-muted">
                    Certains choix déclenchent des informations contextuelles plus tard.
                  </div>
                </div>
              </div>
            ) : null}

            {subStep === "C" ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-navy">
                  Quel est votre objectif principal concernant le Canada ? *
                </div>
                <RadioGroup
                  value={form.mainObjective ?? ""}
                  onChange={(v) => set("mainObjective", oneOf(MAIN_OBJECTIVES, v))}
                  disabled={saving || isSubmitted}
                  options={[
                    { value: "ETUDIER", label: "Étudier" },
                    { value: "TRAVAILLER", label: "Travailler" },
                    { value: "ENTREPRENDRE", label: "Entreprendre / Investir" },
                    { value: "FAMILLE", label: "Rejoindre un membre de la famille" },
                    { value: "EXPLORER", label: "Explorer mes options (je ne sais pas encore)" },
                  ]}
                />
                <FieldError message={fieldErrors.mainObjective} />
              </div>
            ) : null}

            {subStep === "D" ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-navy">
                  De quoi avez-vous principalement besoin aujourdhui ?
                </div>
                <div className="text-xs text-muted">
                  Choix multiples (vous pouvez cocher plusieurs besoins).
                </div>
                <MultiChoice
                  value={form.needs ?? []}
                  onChange={(v) => set("needs", v)}
                  disabled={saving || isSubmitted}
                  options={[
                    ...NEEDS.map((n) => ({ value: n.id, label: n.label })),
                  ]}
                />
                {Array.isArray(form.needs) && form.needs.length ? (
                  <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
                    <div className="text-xs font-semibold text-muted">Exemples (selon vos choix)</div>
                    <div className="mt-2 space-y-2">
                      {form.needs
                        .filter((id): id is NeedId => typeof id === "string" && isNeedId(id))
                        .slice(0, 3)
                        .map((id) => {
                          const def = NEEDS.find((n) => n.id === id);
                          const ex = def?.examples?.slice(0, 3) ?? [];
                          return (
                            <div key={id}>
                              <div className="text-xs font-semibold text-navy">{needLabel(id)}</div>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
                                {ex.map((t) => (
                                  <li key={t}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {subStep === "E" ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    value={form.professionalSituation ?? ""}
                    onChange={(v) => set("professionalSituation", oneOf(PROFESSIONAL_SITUATIONS, v))}
                    disabled={saving || isSubmitted}
                  >
                    <option value="">Situation actuelle</option>
                    <option value="ETUDIANT">Étudiant</option>
                    <option value="SALARIE">Salarié</option>
                    <option value="ENTREPRENEUR">Entrepreneur / Indépendant</option>
                    <option value="SANS_EMPLOI">Sans emploi</option>
                  </SelectField>
                  <SelectField
                    value={form.domain ?? ""}
                    onChange={(v) => set("domain", oneOf(DOMAINS, v))}
                    disabled={saving || isSubmitted}
                  >
                    <option value="">Domaine principal</option>
                    <option value="TECH">Informatique / Tech</option>
                    <option value="SANTE">Santé</option>
                    <option value="COMMERCE_GESTION">Commerce / Gestion</option>
                    <option value="INGENIERIE">Ingénierie</option>
                    <option value="TECHNIQUE">Artisanat / Technique</option>
                    <option value="AUTRE">Autre</option>
                  </SelectField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    value={form.educationLevel ?? ""}
                    onChange={(v) => set("educationLevel", oneOf(EDUCATION_LEVELS, v))}
                    disabled={saving || isSubmitted}
                  >
                    <option value="">Niveau détudes le plus élevé</option>
                    <option value="SECONDAIRE">Secondaire</option>
                    <option value="BAC_LICENCE">Bac / Licence</option>
                    <option value="MASTER">Master</option>
                    <option value="DOCTORAT">Doctorat</option>
                    <option value="AUTRE">Autre</option>
                  </SelectField>
                  <SelectField
                    value={form.experienceRange ?? ""}
                    onChange={(v) => set("experienceRange", oneOf(EXPERIENCE_RANGES, v))}
                    disabled={saving || isSubmitted}
                  >
                    <option value="">Années dexpérience (approx.)</option>
                    <option value="ZERO_UN">01</option>
                    <option value="DEUX_QUATRE">24</option>
                    <option value="CINQ_PLUS">5+</option>
                  </SelectField>
                </div>
              </div>
            ) : null}

            {subStep === "F" ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-navy">
                    Budget prêt à prévoir (hors billets davion)
                  </div>
                  <div className="mt-2">
                    <SelectField
                      value={form.budgetRange ?? ""}
                      onChange={(v) => set("budgetRange", oneOf(BUDGET_RANGES, v))}
                      disabled={saving || isSubmitted}
                    >
                      <option value="">Sélectionner</option>
                      <option value="MOINS_3000">Moins de 3 000 $</option>
                      <option value="ENTRE_3000_7000">3 000  7 000 $</option>
                      <option value="ENTRE_7000_15000">7 000  15 000 $</option>
                      <option value="PLUS_15000">Plus de 15 000 $</option>
                      <option value="JE_NE_SAIS_PAS">Je ne sais pas encore</option>
                    </SelectField>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-navy">Contraintes particulières</div>
                  <MultiChoice
                    value={form.constraints ?? []}
                    onChange={(v) => set("constraints", v)}
                    disabled={saving || isSubmitted}
                    options={[
                      { value: "DELAIS_COURTS", label: "Délais courts" },
                      { value: "FAMILLE", label: "Situation familiale" },
                      { value: "REFUS_ANTERIEUR", label: "Refus antérieur" },
                      { value: "AUTRES", label: "Autres" },
                    ]}
                  />
                  {(form.constraints ?? []).includes("AUTRES") ? (
                    <div className="mt-2">
                      <Input
                        placeholder="Précisez (optionnel)"
                        value={form.constraintsOther ?? ""}
                        onChange={(e) => set("constraintsOther", e.target.value)}
                        disabled={saving || isSubmitted}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {subStep === "G" ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-navy">Message libre (facultatif)</div>
                <Textarea
                  placeholder="Ajoutez des précisions (max 500 caractères)"
                  value={form.message ?? ""}
                  onChange={(e) => set("message", e.target.value.slice(0, 500))}
                  disabled={saving || isSubmitted}
                />
                <div className="text-xs text-muted">{form.message?.length ?? 0}/500</div>
                <FieldError message={fieldErrors.message} />
              </div>
            ) : null}

            {subStep === "H" ? (
              <div className="space-y-3">
                <div className="rounded-[var(--radius-md)] border border-border bg-white/50 p-3 text-sm text-muted">
                  Aucun engagement prématuré : cette préinscription sert à mieux vous orienter.
                </div>

                <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-white/50 p-3 text-sm">
                  <Checkbox
                    checked={!!form.disclaimerAccepted}
                    onChange={(v) => set("disclaimerAccepted", v)}
                    disabled={saving || isSubmitted}
                  />
                  <span>
                    Je comprends que cette préinscription ne constitue pas une demande officielle dimmigration.
                  </span>
                </label>
                <FieldError message={fieldErrors.disclaimerAccepted} />

                <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-white/50 p-3 text-sm">
                  <Checkbox
                    checked={!!form.contactAccepted}
                    onChange={(v) => set("contactAccepted", v)}
                    disabled={saving || isSubmitted}
                  />
                  <span>Jaccepte dêtre contacté par CAPITUNE dans le cadre de mon projet.</span>
                </label>
                <FieldError message={fieldErrors.contactAccepted} />

                {!isSubmitted ? (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowBudget(true)}
                      disabled={saving || loading}
                    >
                      Estimer mon projet
                    </Button>
                    <div className="mt-1 text-xs text-muted">
                      Estimation indicative du budget global selon vos choix.
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button size="sm" variant="outline" onClick={goPrev} disabled={saving || loading || stepIndex === 1}>
                Retour
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save("draft")}
                  disabled={saving || loading || isSubmitted}
                >
                  {saving ? "Sauvegarde" : "Sauvegarder"}
                </Button>
                {stepIndex < 8 ? (
                  <Button size="sm" onClick={goNext} disabled={saving || loading}>
                    Continuer
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => save("submit")} disabled={saving || loading || isSubmitted}>
                    Soumettre ma préinscription
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
