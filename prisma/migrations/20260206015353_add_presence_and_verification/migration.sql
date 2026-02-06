-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProfileBadgeType" AS ENUM ('VERIFIED', 'PARTNER', 'TOP_CONTRIBUTOR');

-- AlterTable
ALTER TABLE "MarketplaceProfile" ADD COLUMN     "badgesJson" JSONB,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "statusManual" TEXT;

-- AddForeignKey
ALTER TABLE "MarketplaceProfile" ADD CONSTRAINT "MarketplaceProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
