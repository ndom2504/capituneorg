import {
  PrismaClient,
  DocumentStatus,
  DossierStatus,
  AccountType,
  MarketplaceFormat,
  MarketplacePricingMode,
  MarketplaceProfession,
  MarketplaceProfileStatus,
  EventFormat,
  EventLevel,
  EventTheme,
  EventType,
  CommunityPublishMode,
  CommunityCommentMode,
  CommunityBannedWordsAction,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.communityRules.upsert({
    where: { singleton: 1 },
    update: {},
    create: {
      singleton: 1,
      publishMode: CommunityPublishMode.ADMIN_ONLY,
      commentMode: CommunityCommentMode.ALL_USERS,
      allowLinks: true,
      allowImages: true,
      spamPostCooldownSeconds: 3600,
      maxPostsPerDay: 3,
      bannedWords: JSON.stringify([
        "arnaque",
        "visa garanti",
        "garanti",
        "paiement en dehors",
        "whatsapp",
      ]),
      bannedWordsAction: CommunityBannedWordsAction.HIDE,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@capitune.local" },
    update: { accountType: AccountType.ADMIN, isCertified: true },
    create: {
      email: "admin@capitune.local",
      fullName: "Admin Capitune",
      avatarUrl: null,
      coverUrl: null,
      accountType: AccountType.ADMIN,
      isCertified: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "client@capitune.local" },
    update: { accountType: AccountType.USER, isCertified: false },
    create: {
      email: "client@capitune.local",
      fullName: "Client Capitune",
      avatarUrl: null,
      coverUrl: null,
      accountType: AccountType.USER,
      isCertified: false,
    },
  });

  const otherUser = await prisma.user.upsert({
    where: { email: "autre@capitune.local" },
    update: { accountType: AccountType.USER, isCertified: false },
    create: {
      email: "autre@capitune.local",
      fullName: "Autre Client",
      avatarUrl: null,
      coverUrl: null,
      accountType: AccountType.USER,
      isCertified: false,
    },
  });

  const pro = await prisma.user.upsert({
    where: { email: "pro@capitune.local" },
    update: { accountType: AccountType.PROFESSIONAL, isCertified: true },
    create: {
      email: "pro@capitune.local",
      fullName: "Capitune (Professionnel certifié)",
      avatarUrl: null,
      coverUrl: null,
      accountType: AccountType.PROFESSIONAL,
      isCertified: true,
    },
  });

  const pro2 = await prisma.user.upsert({
    where: { email: "pro2@capitune.local" },
    update: { accountType: AccountType.PROFESSIONAL, isCertified: true },
    create: {
      email: "pro2@capitune.local",
      fullName: "Partenaire (Professionnel certifié)",
      avatarUrl: null,
      coverUrl: null,
      accountType: AccountType.PROFESSIONAL,
      isCertified: true,
    },
  });

  // Profils Marketplace (démo)
  await prisma.marketplaceProfile.upsert({
    where: { userId: pro.id },
    update: {
      status: MarketplaceProfileStatus.PUBLISHED,
      isVerified: true,
      profession: MarketplaceProfession.IMMIGRATION_CONSULTANT,
      headline: "Consultant immigration (démo)",
      organization: "Capitune",
      country: "Canada",
      city: "Montréal",
      languagesJson: ["Français", "Anglais"],
      themesJson: ["Travail", "Études", "Documents"],
      specialtiesJson: ["Orientation", "Permis de travail", "Préparation dossier"],
      servicesJson: ["Évaluation de profil", "Préparation documents", "Coaching emploi"],
      targetAudiencesJson: ["Travailleurs", "Étudiants"],
      availabilityJson: { days: ["MON", "WED", "FRI"], hours: "09:00-17:00" },
      format: MarketplaceFormat.VISIO,
      pricingMode: MarketplacePricingMode.FREE,
      bioShort: "Accompagnement structuré et transparent (démo).",
      bioLong:
        "Je vous aide à clarifier vos options et à structurer votre plan d’action. Pas de promesse de résultat, uniquement une démarche claire et conforme.",
    },
    create: {
      userId: pro.id,
      status: MarketplaceProfileStatus.PUBLISHED,
      isVerified: true,
      profession: MarketplaceProfession.IMMIGRATION_CONSULTANT,
      headline: "Consultant immigration (démo)",
      organization: "Capitune",
      country: "Canada",
      city: "Montréal",
      languagesJson: ["Français", "Anglais"],
      themesJson: ["Travail", "Études", "Documents"],
      specialtiesJson: ["Orientation", "Permis de travail", "Préparation dossier"],
      servicesJson: ["Évaluation de profil", "Préparation documents", "Coaching emploi"],
      targetAudiencesJson: ["Travailleurs", "Étudiants"],
      availabilityJson: { days: ["MON", "WED", "FRI"], hours: "09:00-17:00" },
      format: MarketplaceFormat.VISIO,
      pricingMode: MarketplacePricingMode.FREE,
      bioShort: "Accompagnement structuré et transparent (démo).",
      bioLong:
        "Je vous aide à clarifier vos options et à structurer votre plan d’action. Pas de promesse de résultat, uniquement une démarche claire et conforme.",
    },
  });

  // Catalogue de services de paiement (MVP)
  const existingServices = await prisma.paymentService.findMany({
    where: {
      OR: [
        { providerUserId: null, title: "Consultation 45 min" },
        { providerUserId: null, title: "Revue documentaire" },
        { providerUserId: pro.id, title: "Session d’orientation 60 min" },
      ],
    },
    select: { id: true },
  });

  if (existingServices.length === 0) {
    await prisma.paymentService.createMany({
      data: [
        {
          providerUserId: null,
          title: "Consultation 45 min",
          description: "Consultation structurée (MVP).",
          priceCents: 8900,
          currency: "cad",
          durationMinutes: 45,
          active: true,
        },
        {
          providerUserId: null,
          title: "Revue documentaire",
          description: "Analyse de documents et retours (MVP).",
          priceCents: 12900,
          currency: "cad",
          durationMinutes: null,
          active: true,
        },
        {
          providerUserId: pro.id,
          title: "Session d’orientation 60 min",
          description: "Évaluation + plan d’action (pro démo).",
          priceCents: 14900,
          currency: "cad",
          durationMinutes: 60,
          active: true,
        },
      ],
    });
  }

  await prisma.marketplaceProfile.upsert({
    where: { userId: pro2.id },
    update: {
      status: MarketplaceProfileStatus.PUBLISHED,
      isVerified: false,
      profession: MarketplaceProfession.EMPLOYMENT_COUNSELOR,
      headline: "Conseiller emploi (démo)",
      organization: "Partenaire",
      country: "Canada",
      city: "Québec",
      languagesJson: ["Français"],
      themesJson: ["Travail", "Installation"],
      specialtiesJson: ["CV Canada", "Entrevues", "LinkedIn"],
      servicesJson: ["Coaching emploi", "Relecture CV", "Préparation entrevues"],
      targetAudiencesJson: ["Travailleurs"],
      availabilityJson: { days: ["TUE", "THU"], hours: "10:00-16:00" },
      format: MarketplaceFormat.BOTH,
      pricingMode: MarketplacePricingMode.PAID,
      price30Min: 35,
      price60Min: 60,
      bioShort: "Optimisation CV + entretien pour le marché canadien (démo).",
      bioLong:
        "Coaching pragmatique orienté résultats mesurables (sans promesse). Nous travaillons votre CV, votre pitch et vos candidatures.",
    },
    create: {
      userId: pro2.id,
      status: MarketplaceProfileStatus.PUBLISHED,
      isVerified: false,
      profession: MarketplaceProfession.EMPLOYMENT_COUNSELOR,
      headline: "Conseiller emploi (démo)",
      organization: "Partenaire",
      country: "Canada",
      city: "Québec",
      languagesJson: ["Français"],
      themesJson: ["Travail", "Installation"],
      specialtiesJson: ["CV Canada", "Entrevues", "LinkedIn"],
      servicesJson: ["Coaching emploi", "Relecture CV", "Préparation entrevues"],
      targetAudiencesJson: ["Travailleurs"],
      availabilityJson: { days: ["TUE", "THU"], hours: "10:00-16:00" },
      format: MarketplaceFormat.BOTH,
      pricingMode: MarketplacePricingMode.PAID,
      price30Min: 35,
      price60Min: 60,
      bioShort: "Optimisation CV + entretien pour le marché canadien (démo).",
      bioLong:
        "Coaching pragmatique orienté résultats mesurables (sans promesse). Nous travaillons votre CV, votre pitch et vos candidatures.",
    },
  });

  // Préinscription de démo soumise pour tester le module Clients
  await prisma.preRegistration.upsert({
    where: { userId: otherUser.id },
    update: {
      status: "SUBMITTED",
      firstName: "Autre",
      lastName: "Client",
      email: otherUser.email,
      language: "FRANCAIS",
      countryOfResidence: "Maroc",
      city: "Casablanca",
      nationality: "Marocaine",
      residenceSituation: "PAYS_ORIGINE",
      mainObjective: "TRAVAILLER",
      needsJson: ["ORIENTATION", "EVALUATION"],
      budgetRange: "ENTRE_3000_7000",
      constraintsJson: ["DELAIS_COURTS"],
      message: "Je souhaite comprendre mes options et planifier un appel.",
      disclaimerAccepted: true,
      contactAccepted: true,
    },
    create: {
      userId: otherUser.id,
      status: "SUBMITTED",
      firstName: "Autre",
      lastName: "Client",
      email: otherUser.email,
      language: "FRANCAIS",
      countryOfResidence: "Maroc",
      city: "Casablanca",
      nationality: "Marocaine",
      residenceSituation: "PAYS_ORIGINE",
      mainObjective: "TRAVAILLER",
      needsJson: ["ORIENTATION", "EVALUATION"],
      budgetRange: "ENTRE_3000_7000",
      constraintsJson: ["DELAIS_COURTS"],
      message: "Je souhaite comprendre mes options et planifier un appel.",
      disclaimerAccepted: true,
      contactAccepted: true,
    },
  });

  const postsCount = await prisma.adminPost.count();
  if (postsCount === 0) {
    const p1 = await prisma.adminPost.create({
      data: {
        adminLabel: "Admin Capitune",
        content:
          "Bienvenue sur Capitune. Ici, vous suivez votre parcours d’immigration, vos événements & formations, et l’avancement de votre dossier — avec des publications officielles de l’équipe.",
        likes: 12,
        shares: 3,
        comments: {
          create: [
            {
              authorLabel: "Vous",
              message: "Merci, hâte de commencer.",
            },
          ],
        },
      },
    });

    await prisma.adminPost.create({
      data: {
        adminLabel: "Admin Capitune",
        content:
          "Rappel: préparez vos documents (passeport, diplômes, attestations). L’onglet Mon dossier vous aidera à suivre les statuts.",
        likes: 8,
        shares: 1,
      },
    });

    // keep p1 used to avoid TS unused warnings in some setups
    void p1;
  }

  const dossier = await prisma.dossier.upsert({
    where: { id: "dossier-demo" },
    update: {},
    create: {
      id: "dossier-demo",
      userId: user.id,
      program: "Immigration Canada",
      status: DossierStatus.LOCAL,
      documents: {
        create: [
          { name: "Passeport", status: DocumentStatus.A_FOURNIR },
          {
            name: "Diplômes",
            status: DocumentStatus.EN_REVUE,
            note: "Traduction en cours",
          },
          { name: "Attestation d’emploi", status: DocumentStatus.VALIDE },
          { name: "Relevés bancaires", status: DocumentStatus.A_FOURNIR },
        ],
      },
    },
  });

  void dossier;

  const userPostsCount = await prisma.userPost.count();
  if (userPostsCount === 0) {
    await prisma.userPost.create({
      data: {
        userId: user.id,
        content:
          "Mon premier post sur Capitune. Je commence mon parcours aujourd’hui !",
      },
    });

    await prisma.userPost.create({
      data: {
        userId: otherUser.id,
        content:
          "Bonjour à tous. Ceci est une publication d’un autre utilisateur (vous pouvez uniquement liker).",
        likesRel: {
          create: [{ userId: user.id }],
        },
        likes: 1,
      },
    });

    await prisma.userPost.create({
      data: {
        userId: pro.id,
        content:
          "Compte professionnel certifié: je propose un accompagnement pour vos démarches. (Démo) ",
      },
    });

    await prisma.userPost.create({
      data: {
        userId: pro2.id,
        content:
          "Professionnel certifié (partenaire): disponible pour un partenariat. (Démo)",
      },
    });
  }

  const networksCount = await prisma.professionalNetwork.count();
  if (networksCount === 0) {
    await prisma.professionalNetwork.create({
      data: {
        name: "Réseau Pro – Démo",
        description: "Un réseau local entre professionnels certifiés (démo).",
        ownerId: pro.id,
        members: {
          create: [
            { userId: pro.id, role: "OWNER" },
            { userId: pro2.id, role: "MEMBER" },
          ],
        },
      },
    });
  }

  const speakersCount = await prisma.speaker.count();
  if (speakersCount === 0) {
    const s1 = await prisma.speaker.create({
      data: {
        fullName: "Conseiller en immigration",
        title: "Consultant · Orientation stratégique",
        bio: "Accompagnement administratif et structuration de parcours (démo).",
      },
    });

    const s2 = await prisma.speaker.create({
      data: {
        fullName: "Spécialiste dossiers & documents",
        title: "Gestion documentaire · Conformité",
        bio: "Méthodes concrètes pour organiser, vérifier et présenter un dossier (démo).",
      },
    });

    const s3 = await prisma.speaker.create({
      data: {
        fullName: "Coach carrière Canada",
        title: "CV, LinkedIn, stratégie emploi",
        bio: "Structurer une recherche d’emploi crédible et éviter les erreurs fréquentes (démo).",
      },
    });

    const s4 = await prisma.speaker.create({
      data: {
        fullName: "Entrepreneuriat & installation",
        title: "Business · Planification",
        bio: "Comprendre les étapes et préparer un plan réaliste (démo).",
      },
    });

    const eventsCount = await prisma.event.count();
    if (eventsCount === 0) {
      const now = new Date("2026-02-03T12:00:00.000Z");

      await prisma.event.create({
        data: {
          title: "Webinaire – Comprendre les options de travail au Canada",
          description:
            "Identifier les programmes adaptés à votre profil et éviter les erreurs fréquentes.",
          objectives:
            "Clarifier les options, comprendre les critères, repartir avec une checklist.",
          audience: "Candidats débutants à intermédiaires.",
          durationMin: 60,
          type: EventType.WEBINAIRE,
          theme: EventTheme.TRAVAIL,
          level: EventLevel.DEBUTANT,
          format: EventFormat.LIVE,
          startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          liveUrl: "https://example.com/live-travail",
          isFeatured: true,
          speakers: { create: [{ speakerId: s1.id }] },
        },
      });

      await prisma.event.create({
        data: {
          title: "Atelier – Dossier & documents : checklist complète",
          description:
            "Atelier pratique pour structurer vos preuves, traductions et attestations.",
          objectives:
            "Organiser votre dossier, prioriser les documents, réduire les erreurs.",
          audience: "Candidats en préparation de dossier.",
          prerequisites: "Avoir une liste de documents disponibles (même incomplète).",
          durationMin: 75,
          type: EventType.ATELIER,
          theme: EventTheme.DOCUMENTS,
          level: EventLevel.INTERMEDIAIRE,
          format: EventFormat.LIVE,
          startsAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
          liveUrl: "https://example.com/live-documents",
          speakers: { create: [{ speakerId: s2.id }] },
        },
      });

      await prisma.event.create({
        data: {
          title: "Formation – Budget & planification : éviter les mauvaises surprises",
          description:
            "Une formation progressive pour estimer et planifier votre budget de mobilité.",
          objectives:
            "Construire un budget réaliste, anticiper les coûts, structurer votre plan.",
          audience: "Tous profils.",
          durationMin: 45,
          type: EventType.FORMATION,
          theme: EventTheme.BUDGET,
          level: EventLevel.DEBUTANT,
          format: EventFormat.REPLAY,
          replayUrl: "https://example.com/replay-budget",
          speakers: { create: [{ speakerId: s4.id }] },
        },
      });

      await prisma.event.create({
        data: {
          title: "Replay – CV & LinkedIn pour le Canada (bases solides)",
          description:
            "Optimiser votre profil et votre CV pour une recherche d’emploi crédible.",
          objectives:
            "Structurer un CV, aligner votre positionnement, éviter les pièges.",
          audience: "Recherche d’emploi.",
          durationMin: 50,
          type: EventType.WEBINAIRE,
          theme: EventTheme.TRAVAIL,
          level: EventLevel.INTERMEDIAIRE,
          format: EventFormat.REPLAY,
          replayUrl: "https://example.com/replay-cv",
          speakers: { create: [{ speakerId: s3.id }] },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
