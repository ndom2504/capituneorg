/*
  Warnings:

  - You are about to drop the `MarketplaceProfile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contentItemId]` on the table `PaymentService` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `EventRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProfessionalProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProContentType" AS ENUM ('EVENT', 'TRAINING');

-- CreateEnum
CREATE TYPE "ProPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FULL', 'ENDED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ProEventType" AS ENUM ('LIVE', 'ATELIER', 'QA');

-- CreateEnum
CREATE TYPE "EnrollmentPaymentStatus" AS ENUM ('FREE', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ContentTargetRole" AS ENUM ('ALL', 'DEMANDEUR', 'PRO');

-- CreateEnum
CREATE TYPE "TrainingFormat" AS ENUM ('VIDEO', 'RESOURCES', 'MIXED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VIDEO', 'AUDIO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SUSPEND_EVENT';
ALTER TYPE "AuditAction" ADD VALUE 'REACTIVATE_EVENT';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_EVENT';

-- AlterEnum
ALTER TYPE "MainObjective" ADD VALUE 'DEMANDE_ASILE';

-- AlterEnum
ALTER TYPE "PaymentOrderStatus" ADD VALUE 'FAILED';

-- DropForeignKey
ALTER TABLE "MarketplaceProfile" DROP CONSTRAINT "MarketplaceProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceProfile" DROP CONSTRAINT "MarketplaceProfile_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceRequest" DROP CONSTRAINT "MarketplaceRequest_profileId_fkey";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mode" "EventMode" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "price" DECIMAL(65,30),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "ProEventStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "status" "EventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT',
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "applicationFeeCents" INTEGER,
ADD COLUMN     "connectedAccountId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentService" ADD COLUMN     "contentItemId" TEXT;

-- DropTable
DROP TABLE "MarketplaceProfile";

-- DropEnum
DROP TYPE "MarketplaceProfileStatus";

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "type" "ProContentType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "eventStatus" "ProEventStatus",
    "eventType" "ProEventType",
    "startsAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "timezone" TEXT,
    "liveUrl" TEXT,
    "replayUrl" TEXT,
    "capacity" INTEGER,
    "imageUrl" TEXT,
    "publishStatus" "ProPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "trainingFormat" "TrainingFormat",
    "level" TEXT,
    "videoUrl" TEXT,
    "objectivesJson" JSONB,
    "resourcesJson" JSONB,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "stripePriceId" TEXT,
    "targetRole" "ContentTargetRole",
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentStatus" "EnrollmentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "paymentOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ProfessionalProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "rejectionReason" TEXT,
    "badgesJson" JSONB,
    "profession" "MarketplaceProfession" NOT NULL,
    "primaryProfessionId" TEXT,
    "secondaryProfessionIdsJson" JSONB,
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
    "idProofUrl" TEXT,
    "verificationRequestedAt" TIMESTAMP(3),
    "bioShort" TEXT,
    "bioLong" TEXT,
    "employerDetails" TEXT,
    "pricingMode" "MarketplacePricingMode" NOT NULL DEFAULT 'FREE',
    "price30Min" INTEGER,
    "price60Min" INTEGER,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completedMissions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOrder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierMessage" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT,

    CONSTRAINT "DossierMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeConnectedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "requirementsDueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripeEventType" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentItem_ownerId_type_createdAt_idx" ON "ContentItem"("ownerId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ContentItem_type_publishStatus_idx" ON "ContentItem"("type", "publishStatus");

-- CreateIndex
CREATE INDEX "ContentItem_type_eventStatus_idx" ON "ContentItem"("type", "eventStatus");

-- CreateIndex
CREATE INDEX "ContentItem_startsAt_idx" ON "ContentItem"("startsAt");

-- CreateIndex
CREATE INDEX "Enrollment_userId_createdAt_idx" ON "Enrollment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Enrollment_contentId_createdAt_idx" ON "Enrollment"("contentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_contentId_userId_key" ON "Enrollment"("contentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_status_idx" ON "ProfessionalProfile"("status");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_profession_idx" ON "ProfessionalProfile"("profession");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_primaryProfessionId_idx" ON "ProfessionalProfile"("primaryProfessionId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_country_idx" ON "ProfessionalProfile"("country");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_city_idx" ON "ProfessionalProfile"("city");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrder_stripeSessionId_key" ON "EventOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "EventOrder_eventId_idx" ON "EventOrder"("eventId");

-- CreateIndex
CREATE INDEX "EventOrder_userId_idx" ON "EventOrder"("userId");

-- CreateIndex
CREATE INDEX "EventOrder_status_idx" ON "EventOrder"("status");

-- CreateIndex
CREATE INDEX "DossierMessage_dossierId_idx" ON "DossierMessage"("dossierId");

-- CreateIndex
CREATE INDEX "DossierMessage_senderId_idx" ON "DossierMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectedAccount_userId_key" ON "StripeConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeConnectedAccount_stripeAccountId_key" ON "StripeConnectedAccount"("stripeAccountId");

-- CreateIndex
CREATE INDEX "StripeConnectedAccount_userId_idx" ON "StripeConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_stripeEventType_createdAt_idx" ON "StripeWebhookEvent"("stripeEventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_slug_idx" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "EventRegistration_status_idx" ON "EventRegistration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentService_contentItemId_key" ON "PaymentService"("contentItemId");

-- CreateIndex
CREATE INDEX "PaymentService_contentItemId_idx" ON "PaymentService"("contentItemId");

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrder" ADD CONSTRAINT "EventOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrder" ADD CONSTRAINT "EventOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierMessage" ADD CONSTRAINT "DossierMessage_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierMessage" ADD CONSTRAINT "DossierMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentService" ADD CONSTRAINT "PaymentService_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeConnectedAccount" ADD CONSTRAINT "StripeConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "StripeConnectedAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
