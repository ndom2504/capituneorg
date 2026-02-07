-- CreateEnum
CREATE TYPE "EmploymentAvailability" AS ENUM ('IMMEDIATE', 'ONE_TO_THREE_MONTHS', 'MORE_THAN_THREE_MONTHS');

-- CreateEnum
CREATE TYPE "EmploymentWorkPreference" AS ENUM ('CANADA_ONLY', 'CANADA_AND_REMOTE');

-- CreateEnum
CREATE TYPE "EmploymentImmigrationSupport" AS ENUM ('YES', 'NO', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "EmploymentProfile" (
    "userId" TEXT NOT NULL,
    "professionalTitle" TEXT NOT NULL,
    "domain" "MainDomain" NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "availability" "EmploymentAvailability" NOT NULL,
    "residenceCountry" TEXT NOT NULL,
    "workPreference" "EmploymentWorkPreference" NOT NULL,
    "targetProvinces" JSONB NOT NULL,
    "contractTypes" JSONB NOT NULL,
    "immigrationSupport" "EmploymentImmigrationSupport" NOT NULL,
    "primaryLanguage" "JobLanguage" NOT NULL,
    "otherLanguagesText" TEXT,
    "cvUrl" TEXT NOT NULL,
    "consentUseCv" BOOLEAN NOT NULL DEFAULT false,
    "accuracyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "EmploymentProfile" ADD CONSTRAINT "EmploymentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
