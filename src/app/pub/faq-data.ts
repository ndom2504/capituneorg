export type PubFaqItem = {
  id: string;
  category: "Programmes" | "Délais" | "Coûts" | "Confiance" | "Vie au Canada";
  question: string;
  answer: string;
  keywords: string[];
};

export const PUB_FAQ_ITEMS: PubFaqItem[] = [
  {
    id: "faq-1",
    category: "Programmes",
    question: "Qu’est-ce que le programme Entrée Express ?",
    answer:
      "Entrée Express est un programme fédéral pour les travailleurs qualifiés. Les candidats sont classés selon le Système de classement global (SCG) (âge, langue, expérience, études) et, en cas d’invitation, soumettent une demande de résidence permanente. Les délais varient selon le profil et le programme.",
    keywords: ["entrée express", "express entry", "ee", "scg", "crs"],
  },
  {
    id: "faq-2",
    category: "Programmes",
    question: "Permis de travail vs résidence permanente : quelle différence ?",
    answer:
      "Un permis de travail permet de travailler au Canada de façon temporaire. La résidence permanente permet de vivre et travailler au Canada sans limite de durée. Beaucoup de parcours commencent par un permis de travail avant de viser la résidence permanente.",
    keywords: ["permis de travail", "work permit", "résidence permanente", "rp"],
  },
  {
    id: "faq-3",
    category: "Programmes",
    question: "Puis-je étudier au Canada en tant qu’étudiant international ?",
    answer:
      "Oui. Il faut généralement une lettre d’acceptation d’un établissement désigné, une preuve de ressources financières et un permis d’études. Après les études, certaines voies peuvent permettre de travailler puis de viser la résidence permanente.",
    keywords: ["études", "étudiant", "permis d'études", "école"],
  },
  {
    id: "faq-4",
    category: "Délais",
    question: "Combien de temps prend une demande d’immigration ?",
    answer:
      "Les délais varient selon le programme et votre situation. À titre indicatif : certains dossiers Entrée Express peuvent prendre plusieurs mois, un permis de travail peut être plus rapide, et un parrainage familial peut prendre davantage de temps. Nous donnons une estimation après analyse de votre profil.",
    keywords: ["délai", "durée", "combien de temps", "timeline"],
  },
  {
    id: "faq-5",
    category: "Coûts",
    question: "Combien coûte une demande d’immigration ?",
    answer:
      "Les coûts incluent généralement des frais gouvernementaux, d’éventuelles traductions, et (si vous choisissez) des frais de consultation. Le total dépend du programme et de la complexité du dossier. Nous clarifions les coûts après l’évaluation initiale.",
    keywords: ["coût", "prix", "tarif", "frais", "payer"],
  },
  {
    id: "faq-6",
    category: "Confiance",
    question: "Vos consultants sont-ils certifiés ?",
    answer:
      "Nous travaillons avec des professionnels vérifiés. Pour les consultants en immigration, la certification et l’inscription aux organismes compétents sont des points clés. Nous vous orientons vers des profils adaptés à votre situation.",
    keywords: ["rcic", "cicc", "consultant", "certifié", "qualifié"],
  },
  {
    id: "faq-7",
    category: "Confiance",
    question: "Comment protégez-vous mes données ?",
    answer:
      "Vos informations sont traitées de façon confidentielle. Nous limitons l’accès aux données, appliquons des mesures de sécurité, et ne partageons pas vos données à des tiers sans nécessité liée au service rendu et/ou votre consentement.",
    keywords: ["confidentialité", "données", "sécurité", "rgpd"],
  },
  {
    id: "faq-8",
    category: "Vie au Canada",
    question: "Quel est le coût de la vie au Canada ?",
    answer:
      "Le coût de la vie dépend fortement de la province et de la ville. Les grandes métropoles sont généralement plus chères. Nous pouvons vous aider à estimer un budget réaliste selon votre destination.",
    keywords: ["coût de la vie", "logement", "budget", "ville"],
  },
];
