-- CreateEnum
CREATE TYPE "MarketplaceEngagementStatus" AS ENUM (
  'DRAFT',
  'CONTRACT_SENT',
  'SIGNED',
  'PAYMENT_REQUESTED',
  'PAID',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED'
);

-- CreateEnum
CREATE TYPE "MarketplaceMilestone" AS ENUM (
  'ANALYSE',
  'DOSSIER',
  'SOUMISSION'
);

-- CreateTable
CREATE TABLE "MarketplaceEngagement" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "status" "MarketplaceEngagementStatus" NOT NULL DEFAULT 'DRAFT',
  "contractTitle" TEXT NOT NULL,
  "contractBody" TEXT NOT NULL,
  "contractSentAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "signedByUserId" TEXT,
  "signedByName" TEXT,
  "paymentRequestedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "milestone" "MarketplaceMilestone" NOT NULL DEFAULT 'ANALYSE',
  "analyseDoneAt" TIMESTAMP(3),
  "dossierDoneAt" TIMESTAMP(3),
  "soumissionDoneAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketplaceEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceEngagement_requestId_key" ON "MarketplaceEngagement"("requestId");

-- CreateIndex
CREATE INDEX "MarketplaceEngagement_professionalId_status_createdAt_idx" ON "MarketplaceEngagement"("professionalId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceEngagement_requesterId_status_createdAt_idx" ON "MarketplaceEngagement"("requesterId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceEngagement" ADD CONSTRAINT "MarketplaceEngagement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceEngagement" ADD CONSTRAINT "MarketplaceEngagement_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceEngagement" ADD CONSTRAINT "MarketplaceEngagement_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceEngagement" ADD CONSTRAINT "MarketplaceEngagement_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
