export type NeedId =
  | "need.orientation"
  | "need.immigration"
  | "need.etudes"
  | "need.travail"
  | "need.recherche-emploi"
  | "need.entrepreneuriat"
  | "need.documents"
  | "need.budget"
  | "need.famille"
  | "need.integration"
  | "need.formation";

export type ServiceId =
  | "service.orientation"
  | "service.immigration"
  | "service.etudes"
  | "service.travail"
  | "service.employeur"
  | "service.entrepreneuriat"
  | "service.documents"
  | "service.budget"
  | "service.famille"
  | "service.integration"
  | "service.formation";

export type TaxonomyItem<TId extends string> = {
  id: TId;
  label: string;
  description?: string;
  examples: string[];
};

export const NEEDS: TaxonomyItem<NeedId>[] = [
  {
    id: "need.orientation",
    label: "Orientation & compréhension",
    description: "Clarifier vos options, étapes et faisabilité.",
    examples: [
      "Comprendre mes options réelles vers le Canada",
      "Identifier le programme le plus adapté à mon profil",
      "Savoir si mon projet est faisable",
      "Éviter les erreurs courantes",
      "Clarifier les étapes à suivre",
    ],
  },
  {
    id: "need.immigration",
    label: "Immigration & conformité",
    description: "Règles, démarches, conformité, situations complexes.",
    examples: [
      "Comprendre les règles d’immigration canadienne",
      "Choisir un programme d’immigration",
      "Être accompagné dans les démarches administratives",
      "Vérifier la conformité de mon dossier",
      "Comprendre un refus ou une situation complexe",
      "Être représenté légalement (si autorisé)",
    ],
  },
  {
    id: "need.etudes",
    label: "Études",
    description: "Programmes, admission, exigences, permis d’études.",
    examples: [
      "Choisir un programme d’études",
      "Trouver un établissement au Canada",
      "Préparer une demande d’admission",
      "Comprendre les exigences linguistiques",
      "Obtenir un permis d’études",
      "Planifier un projet études + travail",
    ],
  },
  {
    id: "need.travail",
    label: "Travail & emploi",
    description: "CV, entretiens, employeur, LMIA, transition pro.",
    examples: [
      "Comprendre les options de travail au Canada",
      "Adapter mon CV au format canadien",
      "Préparer des entretiens",
      "Trouver un employeur",
      "Comprendre le LMIA",
      "Planifier une transition professionnelle",
    ],
  },
  {
    id: "need.recherche-emploi",
    label: "Recherche d’emploi",
    description: "Candidatures, postes ciblés, réseau, employeur et suivi.",
    examples: [
      "Trouver des offres adaptées à mon profil",
      "Cibler des postes et secteurs au Canada",
      "Améliorer mon CV et ma lettre de motivation",
      "Préparer ma stratégie de candidatures",
      "Travailler mon profil LinkedIn et mon réseau",
    ],
  },
  {
    id: "need.entrepreneuriat",
    label: "Entrepreneuriat & investissement",
    description: "Projet d’affaires, programmes, investissement.",
    examples: [
      "Comprendre les options pour entreprendre au Canada",
      "Évaluer la faisabilité d’un projet d’affaires",
      "Préparer un plan d’affaires",
      "Comprendre les programmes pour entrepreneurs",
      "S’informer sur l’investissement et la création d’entreprise",
    ],
  },
  {
    id: "need.documents",
    label: "Documents & administratif",
    description: "Pièces, organisation, vérification, traductions.",
    examples: [
      "Savoir quels documents sont requis",
      "Préparer et organiser mes documents",
      "Vérifier mes documents avant soumission",
      "Traduire des documents officiels",
      "Gérer les délais et échéances",
    ],
  },
  {
    id: "need.budget",
    label: "Budget & finances",
    description: "Coûts, preuve de fonds, planification budgétaire.",
    examples: [
      "Estimer le coût global de mon projet",
      "Préparer une preuve de fonds",
      "Comprendre les frais gouvernementaux",
      "Planifier mon budget d’installation",
      "Éviter les dépenses inutiles",
    ],
  },
  {
    id: "need.famille",
    label: "Situation personnelle & familiale",
    description: "Regroupement familial, enfants, situations particulières.",
    examples: [
      "Inclure ma famille dans le projet",
      "Comprendre le regroupement familial",
      "Gérer une situation particulière (mariage, enfants)",
      "Adapter mon projet à ma situation personnelle",
    ],
  },
  {
    id: "need.integration",
    label: "Préparation & intégration",
    description: "Installation, culture, ressources communautaires.",
    examples: [
      "Me préparer à la vie au Canada",
      "Comprendre le marché du travail canadien",
      "Préparer mon installation",
      "Comprendre la culture et les codes sociaux",
      "Accéder à des ressources communautaires",
    ],
  },
  {
    id: "need.formation",
    label: "Information & formation",
    description: "Webinaires, ateliers, contenu éducatif.",
    examples: [
      "Accéder à des webinaires explicatifs",
      "Participer à des formations pratiques",
      "Poser des questions à des experts",
      "Suivre des parcours éducatifs",
    ],
  },
];

export const SERVICES: TaxonomyItem<ServiceId>[] = [
  {
    id: "service.orientation",
    label: "Orientation & stratégie",
    description: "Diagnostic, recommandations, stratégie de parcours.",
    examples: [
      "Évaluation de profil",
      "Analyse de faisabilité",
      "Orientation stratégique personnalisée",
      "Recommandations de parcours",
      "Diagnostic de projet d’immigration",
    ],
  },
  {
    id: "service.immigration",
    label: "Immigration & juridique",
    description: "Consultations, dossiers, conformité, recours.",
    examples: [
      "Consultation en immigration",
      "Préparation de dossiers d’immigration",
      "Vérification de conformité",
      "Assistance administrative",
      "Représentation légale (selon autorisation)",
      "Gestion des refus et recours",
    ],
  },
  {
    id: "service.etudes",
    label: "Études",
    description: "Orientation académique, admissions, permis d’études.",
    examples: [
      "Orientation académique",
      "Recherche de programmes",
      "Assistance aux admissions",
      "Préparation des demandes d’études",
      "Accompagnement permis d’études",
    ],
  },
  {
    id: "service.travail",
    label: "Travail & emploi",
    description: "CV, entretiens, coaching, LMIA.",
    examples: [
      "Analyse de profil professionnel",
      "Rédaction / optimisation de CV canadien",
      "Préparation aux entretiens",
      "Recherche d’opportunités",
      "Accompagnement LMIA",
      "Coaching emploi",
    ],
  },
  {
    id: "service.employeur",
    label: "Employeur",
    description: "Offres d’emploi, recrutement, matching et informations postes.",
    examples: [
      "Offres d’emploi disponibles",
      "Recrutement / présélection",
      "Matching profil → poste",
      "Informations sur l’entreprise et les postes",
    ],
  },
  {
    id: "service.entrepreneuriat",
    label: "Entrepreneuriat",
    description: "Projet entrepreneurial, plan d’affaires, partenaires.",
    examples: [
      "Évaluation de projet entrepreneurial",
      "Élaboration de plan d’affaires",
      "Accompagnement création d’entreprise",
      "Orientation programmes entrepreneurs",
      "Mise en relation partenaires",
    ],
  },
  {
    id: "service.documents",
    label: "Documents & administratif",
    description: "Gestion documentaire, vérification, traduction.",
    examples: [
      "Gestion documentaire",
      "Vérification des documents",
      "Organisation du dossier",
      "Traduction certifiée",
      "Suivi des échéances",
    ],
  },
  {
    id: "service.budget",
    label: "Budget & finances",
    description: "Estimation, preuve de fonds, planification.",
    examples: [
      "Estimation budgétaire",
      "Planification financière",
      "Assistance preuve de fonds",
      "Analyse des coûts",
      "Préparation financière à l’installation",
    ],
  },
  {
    id: "service.famille",
    label: "Accompagnement familial",
    description: "Regroupement, situations familiales.",
    examples: [
      "Conseil regroupement familial",
      "Dossiers conjoints / enfants",
      "Analyse de situations familiales complexes",
    ],
  },
  {
    id: "service.integration",
    label: "Intégration & installation",
    description: "Arrivée, logement, services, adaptation.",
    examples: [
      "Préparation à l’arrivée",
      "Orientation installation",
      "Conseils logement, assurance, services",
      "Coaching adaptation culturelle",
      "Mise en relation communautaire",
    ],
  },
  {
    id: "service.formation",
    label: "Formation & contenu éducatif",
    description: "Webinaires, ateliers, formations, Q&A.",
    examples: [
      "Animation de webinaires",
      "Formations en ligne",
      "Ateliers pratiques",
      "Sessions questions-réponses",
      "Création de contenu éducatif",
    ],
  },
];

export function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function isNeedId(value: string): value is NeedId {
  return NEEDS.some((n) => n.id === value);
}

export function isServiceId(value: string): value is ServiceId {
  return SERVICES.some((s) => s.id === value);
}

export function normalizeNeedIds(values: unknown): NeedId[] {
  return jsonStringArray(values).filter(isNeedId);
}

export function normalizeServiceIds(values: unknown): ServiceId[] {
  return jsonStringArray(values).filter(isServiceId);
}

export function needLabel(id: string): string {
  const found = NEEDS.find((n) => n.id === id);
  return found?.label ?? id;
}

export function serviceLabel(id: string): string {
  const found = SERVICES.find((s) => s.id === id);
  return found?.label ?? id;
}

export function needsToServiceDomains(needs: NeedId[]): ServiceId[] {
  // mapping 1:1 par domaine (orientation -> orientation, etc.)
  const map: Record<NeedId, ServiceId> = {
    "need.orientation": "service.orientation",
    "need.immigration": "service.immigration",
    "need.etudes": "service.etudes",
    "need.travail": "service.travail",
    "need.recherche-emploi": "service.employeur",
    "need.entrepreneuriat": "service.entrepreneuriat",
    "need.documents": "service.documents",
    "need.budget": "service.budget",
    "need.famille": "service.famille",
    "need.integration": "service.integration",
    "need.formation": "service.formation",
  };
  return needs.map((n) => map[n]);
}
