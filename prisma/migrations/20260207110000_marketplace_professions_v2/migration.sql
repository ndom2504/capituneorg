-- AlterEnum
ALTER TYPE "ProfileBadgeType" ADD VALUE 'REGULATED_PROFESSION';

-- AlterEnum
ALTER TYPE "ProfileBadgeType" ADD VALUE 'EXPERT';

-- AlterTable
ALTER TABLE "MarketplaceProfile" ADD COLUMN "primaryProfessionId" TEXT;
ALTER TABLE "MarketplaceProfile" ADD COLUMN "secondaryProfessionIdsJson" JSONB;

-- CreateIndex
CREATE INDEX "MarketplaceProfile_primaryProfessionId_idx" ON "MarketplaceProfile"("primaryProfessionId");
