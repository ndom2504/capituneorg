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

export type ServiceDomainId =
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

export type ServiceCategoryId =
  | "IMMIGRATION_STATUTS"
  | "EMPLOI_CARRIERE"
  | "ETUDES_FORMATIONS"
  | "INTEGRATION_INSTALLATION"
  | "ENTREPRENEURIAT"
  | "ADMIN_DOCUMENTS"
  | "ACCOMPAGNEMENT_SPECIFIQUE";

export type ServiceCompliance = {
  level: "NORMAL" | "SENSITIVE" | "RESTRICTED";
  notes?: string;
};

export type TaxonomyItem<TId extends string> = {
  id: TId;
  label: string;
  description?: string;
  examples: string[];
  category?: ServiceCategoryId;
  compliance?: ServiceCompliance;
  domain?: ServiceDomainId;
  hiddenInPicker?: boolean;
};

export const SERVICE_CATEGORIES: Array<{ id: ServiceCategoryId; label: string; description?: string }> = [
  {
    id: "IMMIGRATION_STATUTS",
    label: "Immigration & statuts",
    description: "Orientation, statuts temporaires/permanents, suivi administratif (sans promesses trompeuses).",
  },
  {
    id: "EMPLOI_CARRIERE",
    label: "Emploi & carrière",
    description: "CV/LinkedIn, coaching, recherche d’emploi, mise en relation (non garantie).",
  },
  {
    id: "ETUDES_FORMATIONS",
    label: "Études & formations",
    description: "Orientation académique, admission, stratégie études→travail→RP, formations.",
  },
  {
    id: "INTEGRATION_INSTALLATION",
    label: "Intégration & installation",
    description: "Préparation au départ, démarches d’arrivée (information), adaptation et réseau.",
  },
  {
    id: "ENTREPRENEURIAT",
    label: "Entrepreneuriat & projets d’affaires",
    description: "Faisabilité, business plan (orientation), création d’entreprise (info/admin).",
  },
  {
    id: "ADMIN_DOCUMENTS",
    label: "Services administratifs & documents",
    description: "Organisation, conformité documentaire, formulaires, traductions certifiées.",
  },
  {
    id: "ACCOMPAGNEMENT_SPECIFIQUE",
    label: "Accompagnement spécifique",
    description: "Soutien selon profils: francophones, familles, étudiants, talents, etc.",
  },
];

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

export const SERVICES = [
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
    domain: "service.orientation",
    hiddenInPicker: true,
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
    domain: "service.immigration",
    hiddenInPicker: true,
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
    domain: "service.etudes",
    hiddenInPicker: true,
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
    domain: "service.travail",
    hiddenInPicker: true,
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
    domain: "service.employeur",
    hiddenInPicker: true,
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
    domain: "service.entrepreneuriat",
    hiddenInPicker: true,
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
    domain: "service.documents",
    hiddenInPicker: true,
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
    domain: "service.budget",
    hiddenInPicker: true,
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
    domain: "service.famille",
    hiddenInPicker: true,
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
    domain: "service.integration",
    hiddenInPicker: true,
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
    domain: "service.formation",
    hiddenInPicker: true,
  },

  // 1) IMMIGRATION & STATUTS
  {
    id: "service.immigration.analyse-profil",
    label: "Analyse de profil immigration",
    description: "Analyse des options possibles selon votre situation (information & orientation).",
    examples: ["Analyse d’admissibilité", "Clarification des programmes"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.evaluation-admissibilite-canada",
    label: "Évaluation d’admissibilité Canada",
    description: "Vérifie les critères généraux et les points de vigilance.",
    examples: ["Évaluation Express Entry (niveau informatif)", "Pré-check PNP"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.orientation-programmes",
    label: "Orientation des programmes (fédéral / provincial)",
    description: "Comparaison des options et plan de parcours.",
    examples: ["Programmes fédéraux", "Programmes des provinces"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.strategie-parcours",
    label: "Stratégie personnalisée de parcours",
    description: "Plan réaliste: étapes, priorités, risques, alternatives.",
    examples: ["Études→travail→RP", "Travail→RP"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.comparaison-options",
    label: "Comparaison des options d’immigration",
    description: "Aide à choisir selon délais/contraintes/risques (sans garantie).",
    examples: ["Comparaison PNP vs EE", "Études vs travail"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },

  {
    id: "service.immigration.visa-visiteur-orientation-dossier",
    label: "Visa visiteur (orientation & dossier)",
    description: "Préparation et vérification du dossier (soumission légale selon autorisation).",
    examples: ["Liste de pièces", "Vérification cohérence"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: {
      level: "SENSITIVE",
      notes: "La représentation / soumission doit être faite par un professionnel autorisé (RCIC/avocat).",
    },
  },
  {
    id: "service.immigration.permis-etudes-orientation-suivi",
    label: "Permis d’études (orientation & suivi)",
    description: "Accompagnement du dossier (soumission légale selon autorisation).",
    examples: ["Lettre d’explication", "Checklist"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: {
      level: "SENSITIVE",
      notes: "Soumission légale uniquement par un professionnel autorisé.",
    },
  },
  {
    id: "service.immigration.permis-travail-orientation-suivi",
    label: "Permis de travail (orientation & suivi)",
    description: "Accompagnement du dossier (soumission légale selon autorisation).",
    examples: ["Exigences", "Suivi des demandes"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: {
      level: "SENSITIVE",
      notes: "Soumission légale uniquement par un professionnel autorisé.",
    },
  },
  {
    id: "service.immigration.prolongation-statut",
    label: "Prolongation de statut",
    description: "Prépare/contrôle les documents et étapes (selon autorisation).",
    examples: ["Prolongation visiteur", "Prolongation permis"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "SENSITIVE", notes: "Selon la nature du dossier, la soumission doit être autorisée." },
  },
  {
    id: "service.immigration.retablissement-statut",
    label: "Rétablissement de statut",
    description: "Accompagnement (dossier sensible, délais stricts).",
    examples: ["Rétablissement visiteur", "Rétablissement étudiant"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "RESTRICTED", notes: "Dossier sensible — représentation/soumission seulement si autorisé." },
  },

  {
    id: "service.immigration.express-entry-orientation",
    label: "Express Entry (orientation)",
    description: "Évaluation, étapes, documents, stratégie (sans promesse de résultat).",
    examples: ["Comprendre CRS", "Plan d’amélioration profil"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.pnp-orientation",
    label: "Programmes des provinces (PNP)",
    description: "Orientation et préparation (selon autorisation).",
    examples: ["Choix province", "Exigences"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.parrainage-familial-orientation",
    label: "Parrainage familial (orientation)",
    description: "Vérifie l’éligibilité et les pièces (selon autorisation).",
    examples: ["Conjoint", "Enfants"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "SENSITIVE", notes: "Soumission légale selon autorisation." },
  },
  {
    id: "service.immigration.programmes-pilotes-orientation",
    label: "Programmes pilotes (rural, francophone, etc.)",
    description: "Orientation et check des critères (sans garantie).",
    examples: ["Rural & Northern", "Francophone"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.immigration.rp-via-etudes-travail",
    label: "Résidence permanente via études / travail",
    description: "Planifie la trajectoire et les jalons.",
    examples: ["PGWP→EE", "Études→PNP"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "NORMAL" },
  },

  {
    id: "service.immigration.preparation-dossier",
    label: "Préparation de dossier",
    description: "Organisation et préparation des pièces.",
    examples: ["Checklist", "Organisation des preuves"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "SENSITIVE", notes: "Préparation ok; soumission/représentation selon autorisation." },
  },
  {
    id: "service.immigration.verification-documentaire",
    label: "Vérification documentaire",
    description: "Contrôle cohérence, complétude, lisibilité.",
    examples: ["Revue des documents", "Conformité des pièces"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.immigration.suivi-dossier",
    label: "Suivi de dossier immigration",
    description: "Suivi administratif et relances (sans promesse de délais).",
    examples: ["Suivi IRCC", "Suivi pièces manquantes"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.immigration.maj-documents",
    label: "Mise à jour / ajout de documents",
    description: "Organisation des ajouts et réponses.",
    examples: ["Ajout pièce", "Lettre explicative"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.immigration.reponses-demandes-ircc",
    label: "Réponses aux demandes IRCC",
    description: "Préparation des réponses et des documents (selon autorisation).",
    examples: ["Demande de documents", "Clarifications"],
    category: "IMMIGRATION_STATUTS",
    domain: "service.immigration",
    compliance: { level: "RESTRICTED", notes: "Soumission/représentation selon autorisation." },
  },

  // 2) EMPLOI & CARRIÈRE
  {
    id: "service.travail.analyse-profil-professionnel",
    label: "Analyse de profil professionnel",
    description: "Analyse compétences, secteur, positionnement au Canada.",
    examples: ["Plan de repositionnement", "Analyse écarts"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.optimisation-cv-canada",
    label: "Optimisation CV (Canada)",
    description: "Mise en forme et contenu au standard canadien.",
    examples: ["Refonte CV", "Ajustement ATS"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.adaptation-cv-par-secteur",
    label: "Adaptation CV par secteur",
    description: "Versionner le CV selon postes/industries ciblés.",
    examples: ["IT", "Santé", "Admin"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.preparation-lettre-motivation",
    label: "Préparation lettre de motivation",
    description: "Structuration et personnalisation par poste.",
    examples: ["Lettre ciblée", "Pitch"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.optimisation-profil-linkedin",
    label: "Optimisation profil LinkedIn",
    description: "Profil, mots-clés, crédibilité, stratégie de réseau.",
    examples: ["Headline", "À propos", "Mots-clés"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.strategie-recherche-emploi",
    label: "Stratégie de recherche emploi Canada",
    description: "Plan de candidatures, canaux, rythme, suivi.",
    examples: ["Plan 4 semaines", "Pipeline"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.ciblage-employeurs",
    label: "Ciblage employeurs",
    description: "Liste d’entreprises et approche.",
    examples: ["Shortlist", "Approche réseau"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.acces-opportunites-non-garanties",
    label: "Accès opportunités (non garanties)",
    description: "Partage d’opportunités ou de pistes, sans garantie de résultat.",
    examples: ["Pistes", "Ressources"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.coaching-entretiens",
    label: "Coaching entretiens",
    description: "Préparation, storytelling, questions/réponses.",
    examples: ["STAR", "Questions comportementales"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.simulation-entretien",
    label: "Simulation d’entretien",
    description: "Mock interview + feedback actionnable.",
    examples: ["Simulation 30min", "Feedback"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.employeur.mise-en-relation-employeur",
    label: "Mise en relation employeur (si autorisé)",
    description: "Mise en relation / présélection selon règles et disponibilité (non garantie).",
    examples: ["Matching", "Présélection"],
    category: "EMPLOI_CARRIERE",
    domain: "service.employeur",
    compliance: { level: "SENSITIVE", notes: "Pas de promesse d’embauche; respecter les règles de la plateforme." },
  },
  {
    id: "service.travail.suivi-integration-professionnelle",
    label: "Suivi d’intégration professionnelle",
    description: "Suivi post-embauche: adaptation, communication, objectifs.",
    examples: ["Plan 30-60-90", "Coaching"],
    category: "EMPLOI_CARRIERE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },

  // 3) ÉTUDES & FORMATIONS
  {
    id: "service.etudes.orientation-etudes-canada",
    label: "Orientation études Canada",
    description: "Choix de parcours et objectifs.",
    examples: ["Choix programme", "Niveau d’études"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.etudes.choix-etablissement-programme",
    label: "Choix établissement / programme",
    description: "Shortlist d’établissements et critères.",
    examples: ["Collège", "Université"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.etudes.evaluation-equivalence-diplomes-info",
    label: "Évaluation équivalence diplômes (info)",
    description: "Information sur démarches (ECA, organismes, délais) — pas de garantie.",
    examples: ["ECA", "WES/ICES"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.etudes.strategie-etudes-travail-rp",
    label: "Stratégie études → travail → RP",
    description: "Planifie une trajectoire réaliste et conforme.",
    examples: ["PGWP", "EE/PNP"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.etudes.constitution-dossier-admission",
    label: "Constitution dossier admission",
    description: "Dossier d’admission: documents, formulaires, calendrier.",
    examples: ["Dossier complet", "Planification"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "SENSITIVE", notes: "Dépend des politiques des établissements; pas de promesse d’admission." },
  },
  {
    id: "service.etudes.suivi-admission",
    label: "Suivi admission",
    description: "Suivi administratif avec l’établissement (sans promesse de délais).",
    examples: ["Relances", "Checklist"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.etudes.accompagnement-permis-etudes",
    label: "Accompagnement permis d’études",
    description: "Orientation & dossier (soumission légale selon autorisation).",
    examples: ["Checklist", "Lettre d’explication"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "SENSITIVE", notes: "Soumission/représentation selon autorisation." },
  },
  {
    id: "service.etudes.renouvellement-changement-etablissement",
    label: "Renouvellement / changement d’établissement",
    description: "Conseils et étapes (selon autorisation pour l’immigration).",
    examples: ["Changement DLI", "Renouvellement"],
    category: "ETUDES_FORMATIONS",
    domain: "service.etudes",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.formation.formations-linguistiques",
    label: "Formations linguistiques",
    description: "Accompagnement linguistique (cours, plan de progression).",
    examples: ["Français", "Anglais"],
    category: "ETUDES_FORMATIONS",
    domain: "service.formation",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.formation.certifications-professionnelles",
    label: "Certifications professionnelles",
    description: "Orientation certifications et préparation.",
    examples: ["PMP", "CompTIA"],
    category: "ETUDES_FORMATIONS",
    domain: "service.formation",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.formation.webinaires-capitune",
    label: "Formations CAPITUNE (webinaires, lives)",
    description: "Animation d’ateliers, webinaires, lives éducatifs.",
    examples: ["Webinaire immigration", "Atelier CV"],
    category: "ETUDES_FORMATIONS",
    domain: "service.formation",
    compliance: { level: "NORMAL" },
  },

  // 4) INTÉGRATION & INSTALLATION
  {
    id: "service.integration.plan-installation",
    label: "Plan d’installation",
    description: "Plan d’arrivée: priorités, budget, étapes.",
    examples: ["Plan 30 jours", "Checklist"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.budget-cout-vie",
    label: "Budget & coût de la vie",
    description: "Estimation réaliste et planification (sans promesse).",
    examples: ["Budget Montréal", "Coût logement"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.preparation-administrative",
    label: "Préparation administrative",
    description: "Documents et démarches avant départ.",
    examples: ["Documents", "Démarches"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.checklist-arrivee",
    label: "Check-list arrivée",
    description: "Check-list d’arrivée et premiers jours.",
    examples: ["NAS", "RAMQ", "Logement"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.recherche-logement-orientation",
    label: "Recherche logement (orientation)",
    description: "Conseils, plateformes, points de vigilance.",
    examples: ["Bail", "Quartiers"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.demarches-nas-ramq-info",
    label: "Démarches NAS / RAMQ (info)",
    description: "Information sur démarches et documents requis.",
    examples: ["NAS", "RAMQ"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.ouverture-compte-bancaire-info",
    label: "Ouverture compte bancaire (info)",
    description: "Information sur options et documents.",
    examples: ["Choix banque", "Documents"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.inscription-services-essentiels",
    label: "Inscription services essentiels",
    description: "Téléphone, internet, école, etc. (orientation).",
    examples: ["Services", "Écoles"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.orientation-culturelle",
    label: "Orientation culturelle",
    description: "Codes, culture, attentes.",
    examples: ["Culture au travail", "Vie quotidienne"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.coaching-adaptation",
    label: "Coaching adaptation",
    description: "Accompagnement à l’intégration et adaptation.",
    examples: ["Coaching", "Réseau"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.integration.reseautage-professionnel",
    label: "Réseautage professionnel",
    description: "Stratégie réseau et mise en relation (non garantie).",
    examples: ["Meetups", "Réseau LinkedIn"],
    category: "INTEGRATION_INSTALLATION",
    domain: "service.integration",
    compliance: { level: "NORMAL" },
  },

  // 5) ENTREPRENEURIAT
  {
    id: "service.entrepreneuriat.orientation-projets-affaires",
    label: "Orientation projets d’affaires Canada",
    description: "Cadrage du projet et options possibles.",
    examples: ["Choix province", "Modèle d’affaires"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.entrepreneuriat.etude-faisabilite",
    label: "Étude de faisabilité",
    description: "Analyse de viabilité et risques.",
    examples: ["Marché", "Coûts", "Risques"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.entrepreneuriat.business-plan-orientation",
    label: "Business plan (orientation)",
    description: "Structuration (sans conseil fiscal/juridique).",
    examples: ["Executive summary", "Prévisionnel"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "SENSITIVE", notes: "Pas de conseil fiscal/juridique sans autorisation." },
  },
  {
    id: "service.entrepreneuriat.programmes-entrepreneurs-immigration",
    label: "Programmes entrepreneuriaux immigration",
    description: "Orientation sur programmes et critères (sans garantie).",
    examples: ["Start-up", "Programmes provinciaux"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.entrepreneuriat.demarches-creation-entreprise",
    label: "Démarches création entreprise",
    description: "Étapes et check-list (information / admin).",
    examples: ["Immatriculation", "Banque"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.entrepreneuriat.structure-juridique-info",
    label: "Structure juridique (info)",
    description: "Information générale — pas de conseil juridique.",
    examples: ["Incorporation vs entreprise individuelle"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "RESTRICTED", notes: "Pas de conseil juridique sans autorisation." },
  },
  {
    id: "service.entrepreneuriat.orientation-fiscale-info",
    label: "Orientation fiscale (info)",
    description: "Information générale — pas de conseil fiscal.",
    examples: ["Taxes", "Comptabilité"],
    category: "ENTREPRENEURIAT",
    domain: "service.entrepreneuriat",
    compliance: { level: "RESTRICTED", notes: "Pas de conseil fiscal sans autorisation." },
  },

  // 6) ADMIN / DOCUMENTS
  {
    id: "service.documents.organisation-documents",
    label: "Organisation de documents",
    description: "Organisation, indexation, préparation des pièces.",
    examples: ["Classement", "Nommer les fichiers"],
    category: "ADMIN_DOCUMENTS",
    domain: "service.documents",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.documents.aide-formulaires-administratifs",
    label: "Aide formulaires administratifs",
    description: "Aide à remplir, vérifier, comprendre (selon autorisation).",
    examples: ["Formulaires", "Check"],
    category: "ADMIN_DOCUMENTS",
    domain: "service.documents",
    compliance: { level: "SENSITIVE", notes: "Selon le formulaire, l’assistance peut être réglementée." },
  },
  {
    id: "service.documents.verification-conformite-documents",
    label: "Vérification conformité documents",
    description: "Revue conformité et cohérence documentaire.",
    examples: ["Conformité", "Cohérence"],
    category: "ADMIN_DOCUMENTS",
    domain: "service.documents",
    compliance: { level: "SENSITIVE" },
  },
  {
    id: "service.documents.archivage-suivi",
    label: "Archivage & suivi",
    description: "Archivage et suivi des versions.",
    examples: ["Historique", "Versions"],
    category: "ADMIN_DOCUMENTS",
    domain: "service.documents",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.documents.traduction-certifiee-partenaires",
    label: "Traduction certifiée (via partenaires)",
    description: "Coordination / orientation vers traducteur certifié.",
    examples: ["Traduction certifiée", "Assermentation"],
    category: "ADMIN_DOCUMENTS",
    domain: "service.documents",
    compliance: { level: "RESTRICTED", notes: "Traduction certifiée uniquement par professionnels habilités." },
  },

  // 7) ACCOMPAGNEMENT SPÉCIFIQUE
  {
    id: "service.orientation.accompagnement-francophones",
    label: "Accompagnement francophones",
    description: "Orientation et stratégie dédiées.",
    examples: ["Parcours francophone", "Ressources"],
    category: "ACCOMPAGNEMENT_SPECIFIQUE",
    domain: "service.orientation",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.orientation.accompagnement-diaspora",
    label: "Accompagnement diaspora",
    description: "Orientation contextualisée selon régions/profils.",
    examples: ["Soutien contexte local"],
    category: "ACCOMPAGNEMENT_SPECIFIQUE",
    domain: "service.orientation",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.famille.accompagnement-familles",
    label: "Accompagnement familles",
    description: "Orientation et organisation du projet familial.",
    examples: ["École", "Enfants", "Conjoint"],
    category: "ACCOMPAGNEMENT_SPECIFIQUE",
    domain: "service.famille",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.etudes.accompagnement-etudiants",
    label: "Accompagnement étudiants",
    description: "Orientation et préparation dossier.",
    examples: ["Admission", "Planification"],
    category: "ACCOMPAGNEMENT_SPECIFIQUE",
    domain: "service.etudes",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.entrepreneuriat.accompagnement-entrepreneurs",
    label: "Accompagnement entrepreneurs",
    description: "Cadrage et planification du projet.",
    examples: ["Faisabilité", "Plan"],
    category: "ACCOMPAGNEMENT_SPECIFIQUE",
    domain: "service.entrepreneuriat",
    compliance: { level: "NORMAL" },
  },
  {
    id: "service.travail.accompagnement-talents-qualifies",
    label: "Accompagnement talents qualifiés",
    description: "Stratégie emploi + trajectoire.",
    examples: ["Positionnement", "Plan d’action"],
    category: "ACCOMPAGNEMENT_SPECIFIQUE",
    domain: "service.travail",
    compliance: { level: "NORMAL" },
  },
] as const satisfies readonly TaxonomyItem<string>[];

export type ServiceId = (typeof SERVICES)[number]["id"];

// Vue "large" (évite les soucis d’inférence en union littérale quand on veut lire des props optionnelles)
const SERVICES_WIDE: readonly TaxonomyItem<string>[] = SERVICES;

export const SERVICES_PICKER: readonly TaxonomyItem<string>[] = SERVICES_WIDE.filter(
  (s) => !s.hiddenInPicker,
);

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
