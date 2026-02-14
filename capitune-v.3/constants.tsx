
import { User, UserRole, VerificationStatus, Event, ServiceRequest, NewsPost, ProjectType, ProfessionalNetwork, Notification, Conversation, ChatMessage, EventStatus } from './types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Marc-André Tremblay',
    role: UserRole.PROFESSIONNEL,
    email: 'ma.tremblay@capitune.ca',
    avatar: 'https://i.pravatar.cc/150?u=marc',
    specialty: ProjectType.IMMIGRATION,
    location: 'Montréal, QC',
    verificationStatus: VerificationStatus.VERIFIED,
    badgeLevel: 'Or',
    joinedAt: '2023-01-15',
    bio: 'Consultant CRIC spécialisé en Entrée Express et parrainage familial.',
    status: 'ACTIF',
    isPublic: true
  },
  {
    id: '2',
    name: 'Sophie Lévesque',
    role: UserRole.PROFESSIONNEL,
    email: 's.levesque@capitune.ca',
    avatar: 'https://i.pravatar.cc/150?u=sophie',
    specialty: ProjectType.ETUDES,
    location: 'Québec, QC',
    verificationStatus: VerificationStatus.VERIFIED,
    badgeLevel: 'Argent',
    joinedAt: '2023-03-22',
    bio: 'Accompagnement pour admissions universitaires et permis d’études.',
    status: 'ACTIF',
    isPublic: true
  },
  {
    id: '3',
    name: 'Amine Benhalima',
    role: UserRole.PARTICULIER,
    email: 'amine@email.com',
    avatar: 'https://i.pravatar.cc/150?u=amine',
    verificationStatus: VerificationStatus.PENDING,
    joinedAt: '2024-02-10',
    targetProvince: 'Ontario',
    status: 'ACTIF',
    isPublic: false
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'conv-1', participantId: '1', lastMessage: 'Parfait, j\'analyse vos documents demain.', updatedAt: new Date().toISOString() },
  { id: 'conv-2', participantId: '2', lastMessage: 'Avez-vous reçu le lien Zoom ?', updatedAt: new Date(Date.now() - 3600000).toISOString() }
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-1': [
    { id: 'm1', senderId: '3', text: 'Bonjour Marc-André, j\'ai déposé ma preuve de fonds.', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'm2', senderId: '1', text: 'Bien reçu Amine. Je regarde ça en priorité.', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm3', senderId: '1', text: 'Parfait, j\'analyse vos documents demain.', createdAt: new Date().toISOString() },
  ],
  'conv-2': [
    { id: 'm4', senderId: '2', text: 'Avez-vous reçu le lien Zoom ?', createdAt: new Date().toISOString() },
  ]
};

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'not-1',
    title: 'Document Validé',
    message: 'Votre preuve de fonds a été approuvée par Marc-André.',
    type: 'DOSSIER',
    isRead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'not-2',
    title: 'Nouveau Message',
    message: 'Sophie Lévesque vous a envoyé un message direct.',
    type: 'SOCIAL',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'not-3',
    title: 'Alerte Gouvernance',
    message: 'Mise à jour des quotas Entrée Express pour Juin 2024.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export const MOCK_NEWS: NewsPost[] = [
  {
    id: 'n1',
    authorId: '1',
    category: 'OFFICIEL',
    content: '⚠️ ALERTE GOUVERNANCE : IRCC annonce une mise à jour des seuils de preuve de fonds pour 2025. Consultez notre guide mis à jour dans la section documents.',
    likes: 124,
    comments: [
      { id: 'c1', authorId: '3', authorName: 'Amine B.', authorAvatar: 'https://i.pravatar.cc/150?u=amine', content: 'Merci pour l\'info ! Est-ce que ça impacte les dossiers déjà soumis ?', createdAt: '2024-05-29T11:00:00' }
    ],
    createdAt: '2024-05-29T10:00:00',
    isAlert: true
  },
  {
    id: 'n2',
    authorId: '2',
    category: 'CONSEIL',
    content: '🎓 Conseil du jour : Pour votre permis d\'études, soignez votre lettre d\'explication. C\'est souvent la pièce maîtresse du dossier pour prouver vos intentions.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    likes: 89,
    comments: [],
    createdAt: '2024-05-28T15:30:00'
  }
];

export const MOCK_NETWORKS: ProfessionalNetwork[] = [
  {
    id: 'net1',
    name: 'Cercle des Consultants CRIC - QC',
    description: 'Groupe d\'entraide sur les changements de politique du MIFI et d\'IRCC.',
    memberCount: 124,
    category: ProjectType.IMMIGRATION,
    creatorId: '1',
    isPrivate: true,
    recentActivity: 'Nouvelle note sur le PEQ publiée par Sophie L.'
  },
  {
    id: 'net2',
    name: 'Experts Mobilité Étudiante',
    description: 'Partenariats universités et collèges canadiens pour admissions simplifiées.',
    memberCount: 56,
    category: ProjectType.ETUDES,
    creatorId: '2',
    isPrivate: false,
    recentActivity: 'Webinaire de formation prévu demain.'
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Webinaire : Réussir son Entrée Express 2025',
    type: 'WEBINAIRE',
    date: '2024-06-12T18:00:00',
    duration: '1h00',
    instructor: 'Marc-André Tremblay',
    instructorId: '1',
    thumbnail: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80',
    description: 'Tout savoir sur les nouvelles cibles d’immigration et le calcul des points CRS. Une session interactive pour maximiser vos chances.',
    isPaid: false,
    meetingLink: 'https://zoom.us/j/capitune-ee-2025',
    status: EventStatus.PUBLISHED,
    capacity: 500,
    registeredCount: 342,
    tags: ['Immigration', 'Fédéral']
  },
  {
    id: 'e2',
    title: 'Session Info : S’installer au Nouveau-Brunswick',
    type: 'SESSION_INFO',
    date: '2024-06-15T14:00:00',
    duration: '1h30',
    instructor: 'Bureau de l’Immigration NB',
    instructorId: 'admin-1',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    description: 'Découvrez les opportunités professionnelles dans les provinces de l’Atlantique et les programmes pilotes.',
    isPaid: false,
    meetingLink: 'https://meet.google.com/nb-immigration',
    status: EventStatus.LIVE,
    capacity: 1000,
    registeredCount: 890,
    tags: ['Atlantique', 'Emploi']
  },
  {
    id: 'e3',
    title: 'Formation : Certificat MIFI - Niveau 2',
    type: 'FORMATION',
    date: '2024-05-10T10:00:00',
    duration: '3h00',
    instructor: 'Sophie Lévesque',
    instructorId: '2',
    thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    description: 'Formation approfondie pour les experts sur les nouvelles règles de parrainage collectif au Québec.',
    isPaid: true,
    price: 149.99,
    meetingLink: 'https://capitune.academy/mifi-level2',
    status: EventStatus.REPLAY,
    registeredCount: 156,
    tags: ['Expert', 'Québec']
  }
];

export const MOCK_REQUESTS: ServiceRequest[] = [
  {
    id: 'r1',
    title: 'Révision Dossier Permis d’Études',
    description: 'J’ai ma lettre d’acceptation de l’UQAM, j’ai besoin d’une relecture finale de mes preuves financières.',
    requesterId: '3',
    expertId: '1',
    category: ProjectType.ETUDES,
    status: 'En cours',
    createdAt: '2024-05-25',
    budget: '250$ - 400$',
    documents: [
      { id: 'd1', name: 'Lettre_Acceptation_UQAM.pdf', status: 'VALIDATED', type: 'PDF', updatedAt: '2024-05-25' },
      { id: 'd2', name: 'Preuve_Fonds_Bancaire.pdf', status: 'PENDING', type: 'PDF', updatedAt: '2024-05-26' }
    ]
  }
];
