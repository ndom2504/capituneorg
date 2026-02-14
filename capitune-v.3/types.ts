
export enum UserRole {
  PARTICULIER = 'DEMANDEUR',
  PROFESSIONNEL = 'EXPERT',
  ADMIN = 'ADMIN'
}

export enum ProjectType {
  IMMIGRATION = 'Immigration',
  ETUDES = 'Études',
  TRAVAIL = 'Travail',
  INSTALLATION = 'Installation'
}

export enum VerificationStatus {
  UNVERIFIED = 'NON_VERIFIE',
  PENDING = 'EN_ATTENTE',
  VERIFIED = 'CERTIFIE_CRIC'
}

export enum EventStatus {
  DRAFT = 'BROUILLON',
  PUBLISHED = 'PUBLIE',
  LIVE = 'EN_DIRECT',
  REPLAY = 'REPLAY'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  bannerUrl?: string;
  bio?: string;
  specialty?: ProjectType;
  location?: string;
  verificationStatus: VerificationStatus;
  badgeLevel?: 'Bronze' | 'Argent' | 'Or';
  joinedAt: string;
  targetProvince?: string;
  status: 'ACTIF' | 'SUSPENDU' | 'EN_REVISION';
  isPublic: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'SYSTEM' | 'SOCIAL' | 'DOSSIER';
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  lastMessage?: string;
  updatedAt: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface NewsPost {
  id: string;
  authorId: string;
  category: 'OFFICIEL' | 'COMMUNAUTE' | 'CONSEIL';
  content: string;
  image?: string;
  likes: number;
  comments: PostComment[];
  createdAt: string;
  isAlert?: boolean;
}

export interface ProfessionalNetwork {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: ProjectType;
  creatorId: string;
  isPrivate: boolean;
  recentActivity?: string;
}

export interface Document {
  id: string;
  name: string;
  status: 'MISSING' | 'PENDING' | 'VALIDATED' | 'REJECTED';
  type: string;
  updatedAt: string;
  url?: string;
  slot?: string | null;
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  expertId?: string;
  category: ProjectType;
  status: 'Ouvert' | 'En cours' | 'Clôturé';
  createdAt: string;
  budget?: string;
  documents?: Document[];
}

export interface Event {
  id: string;
  title: string;
  type: 'WEBINAIRE' | 'SESSION_INFO' | 'FORMATION';
  date: string;
  duration: string;
  instructor: string;
  instructorId: string;
  thumbnail: string;
  description: string;
  isPaid: boolean;
  price?: number;
  meetingLink?: string;
  status: EventStatus;
  capacity?: number;
  registeredCount: number;
  tags?: string[];
}
