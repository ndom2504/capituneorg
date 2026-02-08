-- CreateEnum
CREATE TYPE "CommunityPublishMode" AS ENUM ('ADMIN_ONLY', 'PRO_ONLY', 'ALL_USERS');

-- CreateEnum
CREATE TYPE "CommunityCommentMode" AS ENUM ('ADMIN_ONLY', 'PRO_ONLY', 'ALL_USERS');

-- CreateEnum
CREATE TYPE "CommunityBannedWordsAction" AS ENUM ('HIDE', 'WARN', 'BLOCK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PUBLISH_ADMIN_POST';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_COMMUNITY_RULES';

-- AlterTable
ALTER TABLE "UserPost" ADD COLUMN     "isAdminPost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetAccountType" "AccountType",
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "UserPostComment" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CommunityRules" (
    "id" TEXT NOT NULL,
    "singleton" INTEGER NOT NULL DEFAULT 1,
    "publishMode" "CommunityPublishMode" NOT NULL DEFAULT 'ADMIN_ONLY',
    "commentMode" "CommunityCommentMode" NOT NULL DEFAULT 'ALL_USERS',
    "allowLinks" BOOLEAN NOT NULL DEFAULT true,
    "allowImages" BOOLEAN NOT NULL DEFAULT true,
    "spamPostCooldownSeconds" INTEGER NOT NULL DEFAULT 3600,
    "maxPostsPerDay" INTEGER NOT NULL DEFAULT 3,
    "bannedWords" TEXT NOT NULL DEFAULT '[]',
    "bannedWordsAction" "CommunityBannedWordsAction" NOT NULL DEFAULT 'HIDE',
    "updatedByAdminId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRules_singleton_key" ON "CommunityRules"("singleton");

-- CreateIndex
CREATE INDEX "CommunityRules_updatedAt_idx" ON "CommunityRules"("updatedAt");

-- CreateIndex
CREATE INDEX "CommunityRules_updatedByAdminId_updatedAt_idx" ON "CommunityRules"("updatedByAdminId", "updatedAt");

-- AddForeignKey
ALTER TABLE "CommunityRules" ADD CONSTRAINT "CommunityRules_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
