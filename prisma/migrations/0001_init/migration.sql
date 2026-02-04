-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('A_FOURNIR', 'EN_REVUE', 'VALIDE');

-- CreateEnum
CREATE TYPE "DossierStatus" AS ENUM ('LOCAL', 'PREINSCRIPTION', 'EN_COURS', 'TERMINE');

-- CreateEnum
CREATE TYPE "PreRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "CommunicationLanguage" AS ENUM ('FRANCAIS', 'ANGLAIS', 'AUTRE');

-- CreateEnum
CREATE TYPE "ResidenceSituation" AS ENUM ('PAYS_ORIGINE', 'ETRANGER_ETUDES_TRAVAIL', 'TEMPORAIRE');

-- CreateEnum
CREATE TYPE "MainObjective" AS ENUM ('ETUDIER', 'TRAVAILLER', 'ENTREPRENDRE', 'FAMILLE', 'EXPLORER');

-- CreateEnum
CREATE TYPE "ProfessionalSituation" AS ENUM ('ETUDIANT', 'SALARIE', 'ENTREPRENEUR', 'SANS_EMPLOI');

-- CreateEnum
CREATE TYPE "MainDomain" AS ENUM ('TECH', 'SANTE', 'COMMERCE_GESTION', 'INGENIERIE', 'TECHNIQUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('SECONDAIRE', 'BAC_LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE');

-- CreateEnum
CREATE TYPE "ExperienceRange" AS ENUM ('ZERO_UN', 'DEUX_QUATRE', 'CINQ_PLUS');

-- CreateEnum
CREATE TYPE "BudgetRange" AS ENUM ('MOINS_3000', 'ENTRE_3000_7000', 'ENTRE_7000_15000', 'PLUS_15000', 'JE_NE_SAIS_PAS');

-- CreateEnum
CREATE TYPE "UserMediaType" AS ENUM ('NONE', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('USER', 'PROFESSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "MarketplaceProfession" AS ENUM ('IMMIGRATION_CONSULTANT', 'IMMIGRATION_LAWYER', 'ORIENTATION_COUNSELOR', 'ACADEMIC_COUNSELOR', 'EMPLOYMENT_COUNSELOR', 'CASE_MANAGER', 'CERTIFIED_TRANSLATOR', 'INTEGRATION_COACH', 'COMMUNITY_ORG');

-- CreateEnum
CREATE TYPE "MarketplaceFormat" AS ENUM ('VISIO', 'IN_PERSON', 'BOTH');

-- CreateEnum
CREATE TYPE "MarketplaceProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MarketplacePricingMode" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "MarketplaceResponseTime" AS ENUM ('H24', 'H48', 'H72');

-- CreateEnum
CREATE TYPE "MarketplaceRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "MarketplaceUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MarketplaceNeedTopic" AS ENUM ('ETUDES', 'TRAVAIL', 'ENTREPRENEUR', 'DOCUMENTS', 'BUDGET', 'INSTALLATION', 'ORIENTATION', 'IMMIGRATION', 'FAMILLE', 'INTEGRATION', 'FORMATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "MarketplaceMessageSenderRole" AS ENUM ('REQUESTER', 'PROFESSIONAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MarketplaceMessageKind" AS ENUM ('TEXT', 'STATUS_UPDATE', 'MEETING', 'FILE');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PreRegistrationReviewStatus" AS ENUM ('NEW', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "ReviewFeasibility" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('DISCOVERY_CALL', 'ORIENTATION', 'DOSSIER_FOLLOWUP', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProNetworkRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LIVE', 'WEBINAIRE', 'ATELIER', 'FORMATION');

-- CreateEnum
CREATE TYPE "EventTheme" AS ENUM ('ETUDES', 'TRAVAIL', 'ENTREPRENEUR', 'DOCUMENTS', 'BUDGET');

-- CreateEnum
CREATE TYPE "EventLevel" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('LIVE', 'REPLAY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'USER',
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PreRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "language" "CommunicationLanguage",
    "countryOfResidence" TEXT,
    "city" TEXT,
    "nationality" TEXT,
    "residenceSituation" "ResidenceSituation",
    "mainObjective" "MainObjective",
    "needsJson" JSONB,
    "professionalSituation" "ProfessionalSituation",
    "domain" "MainDomain",
    "educationLevel" "EducationLevel",
    "experienceRange" "ExperienceRange",
    "budgetRange" "BudgetRange",
    "constraintsJson" JSONB,
    "constraintsOther" TEXT,
    "message" TEXT,
    "disclaimerAccepted" BOOLEAN NOT NULL DEFAULT false,
    "contactAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreRegistrationReview" (
    "id" TEXT NOT NULL,
    "preRegistrationId" TEXT NOT NULL,
    "status" "PreRegistrationReviewStatus" NOT NULL DEFAULT 'NEW',
    "feasibility" "ReviewFeasibility",
    "recommendedTrack" TEXT,
    "internalNotes" TEXT,
    "assignedProId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreRegistrationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "preRegistrationId" TEXT,
    "title" TEXT NOT NULL,
    "type" "MeetingType" NOT NULL DEFAULT 'OTHER',
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "locationUrl" TEXT,
    "notesInternal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MarketplaceProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "profession" "MarketplaceProfession" NOT NULL,
    "headline" TEXT,
    "organization" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "languagesJson" JSONB,
    "themesJson" JSONB,
    "specialtiesJson" JSONB,
    "servicesJson" JSONB,
    "targetAudiencesJson" JSONB,
    "availabilityJson" JSONB,
    "format" "MarketplaceFormat" NOT NULL DEFAULT 'VISIO',
    "responseTime" "MarketplaceResponseTime",
    "licenseNumber" TEXT,
    "licenseAuthority" TEXT,
    "proofUrl" TEXT,
    "bioShort" TEXT,
    "bioLong" TEXT,
    "employerDetails" TEXT,
    "pricingMode" "MarketplacePricingMode" NOT NULL DEFAULT 'FREE',
    "price30Min" INTEGER,
    "price60Min" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "profileId" TEXT,
    "status" "MarketplaceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "topic" "MarketplaceNeedTopic",
    "urgency" "MarketplaceUrgency",
    "preferredTimeframe" TEXT,
    "message" TEXT,
    "proNote" TEXT,
    "meetingId" TEXT,
    "requesterLastReadAt" TIMESTAMP(3),
    "professionalLastReadAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRequestMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderRole" "MarketplaceMessageSenderRole" NOT NULL,
    "kind" "MarketplaceMessageKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceRequestMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalNetwork" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalNetworkMember" (
    "networkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProNetworkRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalNetworkMember_pkey" PRIMARY KEY ("networkId","userId")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" TEXT,
    "audience" TEXT,
    "prerequisites" TEXT,
    "durationMin" INTEGER,
    "type" "EventType" NOT NULL,
    "theme" "EventTheme" NOT NULL,
    "level" "EventLevel" NOT NULL,
    "format" "EventFormat" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "liveUrl" TEXT,
    "replayUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSpeaker" (
    "eventId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,

    CONSTRAINT "EventSpeaker_pkey" PRIMARY KEY ("eventId","speakerId")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "EventLike" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLike_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipRequest" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "UserMediaType" NOT NULL DEFAULT 'NONE',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPostLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPostLike_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "AdminPost" (
    "id" TEXT NOT NULL,
    "adminLabel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "status" "DossierStatus" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'A_FOURNIR',
    "note" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentService" (
    "id" TEXT NOT NULL,
    "providerUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "durationMinutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "marketplaceRequestId" TEXT,
    "buyerUserId" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "paidAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PreRegistration_userId_key" ON "PreRegistration"("userId");

-- CreateIndex
CREATE INDEX "PreRegistration_userId_idx" ON "PreRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PreRegistrationReview_preRegistrationId_key" ON "PreRegistrationReview"("preRegistrationId");

-- CreateIndex
CREATE INDEX "PreRegistrationReview_assignedProId_idx" ON "PreRegistrationReview"("assignedProId");

-- CreateIndex
CREATE INDEX "PreRegistrationReview_status_idx" ON "PreRegistrationReview"("status");

-- CreateIndex
CREATE INDEX "Meeting_clientId_idx" ON "Meeting"("clientId");

-- CreateIndex
CREATE INDEX "Meeting_proId_idx" ON "Meeting"("proId");

-- CreateIndex
CREATE INDEX "Meeting_startsAt_idx" ON "Meeting"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProfile_userId_key" ON "MarketplaceProfile"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceProfile_status_idx" ON "MarketplaceProfile"("status");

-- CreateIndex
CREATE INDEX "MarketplaceProfile_profession_idx" ON "MarketplaceProfile"("profession");

-- CreateIndex
CREATE INDEX "MarketplaceProfile_country_idx" ON "MarketplaceProfile"("country");

-- CreateIndex
CREATE INDEX "MarketplaceProfile_city_idx" ON "MarketplaceProfile"("city");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRequest_meetingId_key" ON "MarketplaceRequest"("meetingId");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_professionalId_status_idx" ON "MarketplaceRequest"("professionalId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_requesterId_idx" ON "MarketplaceRequest"("requesterId");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_createdAt_idx" ON "MarketplaceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_lastActivityAt_idx" ON "MarketplaceRequest"("lastActivityAt");

-- CreateIndex
CREATE INDEX "MarketplaceRequestMessage_requestId_createdAt_idx" ON "MarketplaceRequestMessage"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfessionalNetwork_ownerId_idx" ON "ProfessionalNetwork"("ownerId");

-- CreateIndex
CREATE INDEX "ProfessionalNetworkMember_userId_idx" ON "ProfessionalNetworkMember"("userId");

-- CreateIndex
CREATE INDEX "EventSpeaker_speakerId_idx" ON "EventSpeaker"("speakerId");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE INDEX "EventLike_userId_idx" ON "EventLike"("userId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "ContactRequest_fromId_idx" ON "ContactRequest"("fromId");

-- CreateIndex
CREATE INDEX "ContactRequest_toId_idx" ON "ContactRequest"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactRequest_fromId_toId_key" ON "ContactRequest"("fromId", "toId");

-- CreateIndex
CREATE INDEX "PartnershipRequest_fromId_idx" ON "PartnershipRequest"("fromId");

-- CreateIndex
CREATE INDEX "PartnershipRequest_toId_idx" ON "PartnershipRequest"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipRequest_fromId_toId_key" ON "PartnershipRequest"("fromId", "toId");

-- CreateIndex
CREATE INDEX "UserPost_userId_idx" ON "UserPost"("userId");

-- CreateIndex
CREATE INDEX "UserPostComment_postId_idx" ON "UserPostComment"("postId");

-- CreateIndex
CREATE INDEX "UserPostComment_userId_idx" ON "UserPostComment"("userId");

-- CreateIndex
CREATE INDEX "UserPostLike_userId_idx" ON "UserPostLike"("userId");

-- CreateIndex
CREATE INDEX "AdminComment_postId_idx" ON "AdminComment"("postId");

-- CreateIndex
CREATE INDEX "Dossier_userId_idx" ON "Dossier"("userId");

-- CreateIndex
CREATE INDEX "Document_dossierId_idx" ON "Document"("dossierId");

-- CreateIndex
CREATE INDEX "PaymentService_providerUserId_idx" ON "PaymentService"("providerUserId");

-- CreateIndex
CREATE INDEX "PaymentService_active_idx" ON "PaymentService"("active");

-- CreateIndex
CREATE INDEX "PaymentOrder_marketplaceRequestId_idx" ON "PaymentOrder"("marketplaceRequestId");

-- CreateIndex
CREATE INDEX "PaymentOrder_buyerUserId_idx" ON "PaymentOrder"("buyerUserId");

-- CreateIndex
CREATE INDEX "PaymentOrder_providerUserId_idx" ON "PaymentOrder"("providerUserId");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

-- CreateIndex
CREATE INDEX "PaymentOrder_createdAt_idx" ON "PaymentOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "PreRegistration" ADD CONSTRAINT "PreRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistrationReview" ADD CONSTRAINT "PreRegistrationReview_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "PreRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRegistrationReview" ADD CONSTRAINT "PreRegistrationReview_assignedProId_fkey" FOREIGN KEY ("assignedProId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_proId_fkey" FOREIGN KEY ("proId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_preRegistrationId_fkey" FOREIGN KEY ("preRegistrationId") REFERENCES "PreRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProfile" ADD CONSTRAINT "MarketplaceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketplaceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequestMessage" ADD CONSTRAINT "MarketplaceRequestMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalNetwork" ADD CONSTRAINT "ProfessionalNetwork_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalNetworkMember" ADD CONSTRAINT "ProfessionalNetworkMember_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "ProfessionalNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalNetworkMember" ADD CONSTRAINT "ProfessionalNetworkMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSpeaker" ADD CONSTRAINT "EventSpeaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSpeaker" ADD CONSTRAINT "EventSpeaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLike" ADD CONSTRAINT "EventLike_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLike" ADD CONSTRAINT "EventLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPost" ADD CONSTRAINT "UserPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostComment" ADD CONSTRAINT "UserPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "UserPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostComment" ADD CONSTRAINT "UserPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostLike" ADD CONSTRAINT "UserPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "UserPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPostLike" ADD CONSTRAINT "UserPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminComment" ADD CONSTRAINT "AdminComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "AdminPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentService" ADD CONSTRAINT "PaymentService_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_marketplaceRequestId_fkey" FOREIGN KEY ("marketplaceRequestId") REFERENCES "MarketplaceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "PaymentService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

