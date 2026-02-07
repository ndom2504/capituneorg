export type ProfessionCategoryId =
  | "profession-category.immigration.regulated"
  | "profession-category.immigration.orientation"
  | "profession-category.employment"
  | "profession-category.studies"
  | "profession-category.integration"
  | "profession-category.entrepreneurship"
  | "profession-category.admin"
  | "profession-category.community"
  | "profession-category.platform";

export type LegacyMarketplaceProfession =
  | "IMMIGRATION_CONSULTANT"
  | "IMMIGRATION_LAWYER"
  | "ORIENTATION_COUNSELOR"
  | "ACADEMIC_COUNSELOR"
  | "EMPLOYMENT_COUNSELOR"
  | "CASE_MANAGER"
  | "CERTIFIED_TRANSLATOR"
  | "INTEGRATION_COACH"
  | "COMMUNITY_ORG";

export type ProfessionCompliance = {
  regulated: boolean;
  requiresLicenseProof: boolean;
  notes?: string;
  requiredBadges?: Array<"VERIFIED" | "REGULATED_PROFESSION" | "EXPERT">;
};

export type ProfessionCategory = {
  id: ProfessionCategoryId;
  label: string;
};

export const PROFESSION_CATEGORIES: readonly ProfessionCategory[] = [
  { id: "profession-category.immigration.regulated", label: "Immigration — métiers réglementés" },
  {
    id: "profession-category.immigration.orientation",
    label: "Immigration — orientation & stratégie (non réglementé)",
  },
  { id: "profession-category.employment", label: "Emploi & carrière" },
  { id: "profession-category.studies", label: "Études & formations" },
  { id: "profession-category.integration", label: "Installation & intégration" },
  { id: "profession-category.entrepreneurship", label: "Entrepreneuriat & projets d’affaires" },
  { id: "profession-category.admin", label: "Administratif & conformité" },
  { id: "profession-category.community", label: "Communauté, réseaux & partenariats" },
  { id: "profession-category.platform", label: "Numérique & support (CAPITUNE & partenaires)" },
] as const;

type Profession = {
  id: string;
  label: string;
  category: ProfessionCategoryId;
  compliance: ProfessionCompliance;
  legacy?: LegacyMarketplaceProfession;
  hiddenInPicker?: boolean;
  // Contrainte demandée: certains métiers verrouillent des familles de services.
  // V1: on garde une contrainte "domaines" au niveau data, exploitable ensuite par UI/API.
  allowedServiceDomains?: readonly string[];
};

export const PROFESSIONS = [
  // Legacy (compat): métiers historiques encore présents en base.
  {
    id: "profession.legacy.certified_translator",
    label: "Traducteur certifié",
    category: "profession-category.admin",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CERTIFIED_TRANSLATOR",
    hiddenInPicker: true,
  },
  {
    id: "profession.legacy.community_org",
    label: "Organisme communautaire",
    category: "profession-category.community",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "COMMUNITY_ORG",
    hiddenInPicker: true,
  },

  // 1) IMMIGRATION — MÉTIERS RÉGLEMENTÉS
  {
    id: "profession.immigration.rcic",
    label: "Consultant réglementé en immigration canadienne (RCIC)",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Représentation/soumission officielle uniquement via profils autorisés.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_CONSULTANT",
    allowedServiceDomains: ["service.immigration", "service.documents"],
  },
  {
    id: "profession.immigration.licensed_consultant",
    label: "Consultant en immigration licencié (Canada)",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Représentation/soumission officielle uniquement via profils autorisés.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_CONSULTANT",
    allowedServiceDomains: ["service.immigration", "service.documents"],
  },
  {
    id: "profession.immigration.authorized_representative",
    label: "Représentant autorisé en immigration",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Représentation/soumission officielle uniquement via profils autorisés.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_CONSULTANT",
    allowedServiceDomains: ["service.immigration", "service.documents"],
  },
  {
    id: "profession.immigration.regulated_consultant",
    label: "Consultant immigration (statut réglementé)",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Représentation/soumission officielle uniquement via profils autorisés.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_CONSULTANT",
    allowedServiceDomains: ["service.immigration", "service.documents"],
  },
  {
    id: "profession.law.immigration_lawyer",
    label: "Avocat en droit de l’immigration (Canada)",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Conseil et représentation juridique selon permis/Barreau.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_LAWYER",
    allowedServiceDomains: ["service.immigration", "service.documents"],
  },
  {
    id: "profession.law.employment_lawyer",
    label: "Avocat en droit du travail (Canada)",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Conseil et représentation juridique selon permis/Barreau.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_LAWYER",
  },
  {
    id: "profession.law.international_lawyer",
    label: "Avocat en droit international",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Conseil et représentation juridique selon permis/Barreau.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_LAWYER",
  },
  {
    id: "profession.law.immigration_legal_specialist",
    label: "Juriste spécialisé en immigration",
    category: "profession-category.immigration.regulated",
    compliance: {
      regulated: true,
      requiresLicenseProof: true,
      notes: "Ce rôle peut être réglementé selon la juridiction et les actes réalisés.",
      requiredBadges: ["VERIFIED", "REGULATED_PROFESSION"],
    },
    legacy: "IMMIGRATION_LAWYER",
  },

  // 2) IMMIGRATION — ORIENTATION & STRATÉGIE (NON RÉGLEMENTÉ)
  {
    id: "profession.immigration.orientation_counselor",
    label: "Conseiller en orientation immigration",
    category: "profession-category.immigration.orientation",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Pas de soumission officielle de dossiers.",
    },
    legacy: "ORIENTATION_COUNSELOR",
    allowedServiceDomains: ["service.orientation", "service.immigration", "service.documents"],
  },
  {
    id: "profession.immigration.profile_analyst",
    label: "Analyste de profil immigration",
    category: "profession-category.immigration.orientation",
    compliance: { regulated: false, requiresLicenseProof: false, notes: "Pas de soumission officielle de dossiers." },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.immigration.pathway_strategist",
    label: "Consultant en stratégie de parcours Canada",
    category: "profession-category.immigration.orientation",
    compliance: { regulated: false, requiresLicenseProof: false, notes: "Pas de soumission officielle de dossiers." },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.immigration.canada_pathway_coach",
    label: "Coach parcours Canada",
    category: "profession-category.immigration.orientation",
    compliance: { regulated: false, requiresLicenseProof: false, notes: "Pas de soumission officielle de dossiers." },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.immigration.mobility_counselor",
    label: "Conseiller mobilité internationale",
    category: "profession-category.immigration.orientation",
    compliance: { regulated: false, requiresLicenseProof: false, notes: "Pas de soumission officielle de dossiers." },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.immigration.migration_project_consultant",
    label: "Consultant projets migratoires",
    category: "profession-category.immigration.orientation",
    compliance: { regulated: false, requiresLicenseProof: false, notes: "Pas de soumission officielle de dossiers." },
    legacy: "ORIENTATION_COUNSELOR",
  },

  // 3) EMPLOI & CARRIÈRE
  {
    id: "profession.employment.employment_counselor",
    label: "Conseiller en emploi",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
    allowedServiceDomains: ["service.travail", "service.orientation"],
  },
  {
    id: "profession.employment.career_coach",
    label: "Coach carrière",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.employability_consultant",
    label: "Consultant employabilité",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.professional_mentor",
    label: "Mentor professionnel",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.insertion_counselor",
    label: "Conseiller insertion professionnelle",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.recruitment_consultant",
    label: "Consultant en recrutement",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.international_recruiter",
    label: "Spécialiste recrutement international",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.hr_consultant",
    label: "Consultant RH",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.recruiter",
    label: "Chargé de recrutement",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.hr_advisor",
    label: "Conseiller ressources humaines",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.cv_expert",
    label: "Expert CV (Canada)",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.interview_coach",
    label: "Coach entretien d’embauche",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.personal_branding_consultant",
    label: "Consultant branding professionnel",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },
  {
    id: "profession.employment.linkedin_consultant",
    label: "Consultant LinkedIn",
    category: "profession-category.employment",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "EMPLOYMENT_COUNSELOR",
  },

  // 4) ÉTUDES & FORMATIONS
  {
    id: "profession.studies.school_guidance_counselor",
    label: "Conseiller en orientation scolaire",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
    allowedServiceDomains: ["service.etudes", "service.orientation"],
  },
  {
    id: "profession.studies.international_studies_consultant",
    label: "Consultant études internationales",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
  },
  {
    id: "profession.studies.canada_admissions_advisor",
    label: "Conseiller admissions Canada",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
  },
  {
    id: "profession.studies.education_agent_partner",
    label: "Agent éducatif (partenaire établissements)",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false, notes: "Peut être marqué Partenaire CAPITUNE." },
    legacy: "ACADEMIC_COUNSELOR",
  },
  {
    id: "profession.training.language_trainer",
    label: "Formateur linguistique (français / anglais)",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
    allowedServiceDomains: ["service.formation", "service.etudes"],
  },
  {
    id: "profession.training.certifying_trainer",
    label: "Formateur professionnel certifiant",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
  },
  {
    id: "profession.training.facilitator",
    label: "Animateur de formations",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
  },
  {
    id: "profession.training.webinar_host",
    label: "Animateur de webinaires",
    category: "profession-category.studies",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "ACADEMIC_COUNSELOR",
  },

  // 5) INSTALLATION & INTÉGRATION
  {
    id: "profession.integration.settlement_advisor",
    label: "Conseiller en installation Canada",
    category: "profession-category.integration",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "INTEGRATION_COACH",
    allowedServiceDomains: ["service.installation", "service.integration"],
  },
  {
    id: "profession.integration.cultural_integration_coach",
    label: "Coach intégration culturelle",
    category: "profession-category.integration",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "INTEGRATION_COACH",
  },
  {
    id: "profession.integration.practical_life_advisor",
    label: "Conseiller vie pratique au Canada",
    category: "profession-category.integration",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "INTEGRATION_COACH",
  },
  {
    id: "profession.integration.newcomer_companion",
    label: "Accompagnateur nouveaux arrivants",
    category: "profession-category.integration",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "INTEGRATION_COACH",
  },
  {
    id: "profession.integration.welcome_agent",
    label: "Agent d’accueil & intégration",
    category: "profession-category.integration",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "INTEGRATION_COACH",
  },

  // 6) ENTREPRENEURIAT & PROJETS D’AFFAIRES
  {
    id: "profession.entrepreneurship.business_creation_advisor",
    label: "Conseiller en création d’entreprise",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Pas de conseil fiscal/juridique sans titre légal.",
    },
    legacy: "ORIENTATION_COUNSELOR",
    allowedServiceDomains: ["service.entrepreneuriat"],
  },
  {
    id: "profession.entrepreneurship.entrepreneurial_projects_consultant",
    label: "Consultant projets entrepreneuriaux",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Pas de conseil fiscal/juridique sans titre légal.",
    },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.entrepreneurship.business_coach",
    label: "Coach business",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Pas de conseil fiscal/juridique sans titre légal.",
    },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.entrepreneurship.business_project_analyst",
    label: "Analyste de projets d’affaires",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Pas de conseil fiscal/juridique sans titre légal.",
    },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.entrepreneurship.tax_orientation_consultant",
    label: "Consultant fiscal (orientation)",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Orientation uniquement. Pas de conseil fiscal sans titre légal.",
    },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.entrepreneurship.legal_orientation_consultant",
    label: "Consultant juridique (orientation)",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Orientation uniquement. Pas de conseil juridique sans titre légal.",
    },
    legacy: "ORIENTATION_COUNSELOR",
  },
  {
    id: "profession.entrepreneurship.project_financing_advisor",
    label: "Conseiller financement de projets",
    category: "profession-category.entrepreneurship",
    compliance: {
      regulated: false,
      requiresLicenseProof: false,
      notes: "Pas de conseil financier réglementé.",
    },
    legacy: "ORIENTATION_COUNSELOR",
  },

  // 7) ADMINISTRATIF & CONFORMITÉ
  {
    id: "profession.admin.immigration_admin_assistant",
    label: "Assistant administratif spécialisé immigration",
    category: "profession-category.admin",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
    allowedServiceDomains: ["service.documents", "service.immigration"],
  },
  {
    id: "profession.admin.case_manager",
    label: "Gestionnaire de dossiers",
    category: "profession-category.admin",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.admin.admin_coordinator",
    label: "Coordonnateur administratif",
    category: "profession-category.admin",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.admin.document_compliance_specialist",
    label: "Spécialiste conformité documentaire",
    category: "profession-category.admin",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.admin.admin_followup_officer",
    label: "Chargé de suivi administratif",
    category: "profession-category.admin",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },

  // 8) COMMUNAUTÉ, RÉSEAUX & PARTENARIATS
  {
    id: "profession.community.community_facilitator",
    label: "Animateur communautaire",
    category: "profession-category.community",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "COMMUNITY_ORG",
    allowedServiceDomains: ["service.integration", "service.orientation"],
  },
  {
    id: "profession.community.diaspora_lead",
    label: "Responsable diaspora",
    category: "profession-category.community",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "COMMUNITY_ORG",
  },
  {
    id: "profession.community.partnerships_manager",
    label: "Chargé de partenariats",
    category: "profession-category.community",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "COMMUNITY_ORG",
  },
  {
    id: "profession.community.international_network_coordinator",
    label: "Coordinateur réseaux internationaux",
    category: "profession-category.community",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "COMMUNITY_ORG",
  },
  {
    id: "profession.community.professional_communities_manager",
    label: "Gestionnaire communautés professionnelles",
    category: "profession-category.community",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "COMMUNITY_ORG",
  },

  // 9) NUMÉRIQUE & SUPPORT
  {
    id: "profession.platform.platform_admin",
    label: "Administrateur de plateforme",
    category: "profession-category.platform",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.platform.user_support",
    label: "Support utilisateur",
    category: "profession-category.platform",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.platform.content_manager",
    label: "Gestionnaire de contenu & ressources",
    category: "profession-category.platform",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.platform.pathway_data_analyst",
    label: "Analyste de données parcours",
    category: "profession-category.platform",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
  {
    id: "profession.platform.quality_compliance_manager",
    label: "Responsable qualité & conformité plateforme",
    category: "profession-category.platform",
    compliance: { regulated: false, requiresLicenseProof: false },
    legacy: "CASE_MANAGER",
  },
] as const satisfies readonly Profession[];

export type ProfessionId = (typeof PROFESSIONS)[number]["id"];

const professionIds = new Set<string>(PROFESSIONS.map((p) => p.id));

export function isProfessionId(value: unknown): value is ProfessionId {
  return typeof value === "string" && professionIds.has(value);
}

export function professionLabel(id: string): string {
  return PROFESSIONS.find((p) => p.id === id)?.label ?? id;
}

export function professionCategoryLabel(id: ProfessionCategoryId): string {
  return PROFESSION_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getProfession(id: string): Profession | null {
  return (PROFESSIONS as readonly Profession[]).find((p) => p.id === id) ?? null;
}

export function isRegulatedProfession(id: string): boolean {
  return getProfession(id)?.compliance.regulated ?? false;
}

export function legacyMarketplaceProfessionFromProfessionId(
  id: string,
): LegacyMarketplaceProfession {
  const p = getProfession(id);
  return p?.legacy ?? "ORIENTATION_COUNSELOR";
}

export function professionAllowedServiceDomains(id: string): readonly string[] | null {
  return getProfession(id)?.allowedServiceDomains ?? null;
}

export const PROFESSIONS_PICKER: readonly Profession[] = (
  PROFESSIONS as readonly Profession[]
).filter((p) => !p.hiddenInPicker);

