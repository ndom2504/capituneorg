-- CreateEnum pour JobApplicationStatus
CREATE TYPE "JobApplicationStatus" AS ENUM ('RECUE', 'EN_COURS', 'RETENUE', 'REFUSEE');

-- CreateEnum pour JobLanguage
CREATE TYPE "JobLanguage" AS ENUM ('FR', 'EN', 'BILINGUE');

-- Supprimer la relation JobApplication -> MarketplaceRequest
ALTER TABLE "JobApplication" DROP CONSTRAINT IF EXISTS "JobApplication_requestId_fkey";
ALTER TABLE "JobApplication" DROP COLUMN IF EXISTS "requestId";

-- Modifier JobApplication: supprimer coverLetter, rendre cvUrl obligatoire, changer status
ALTER TABLE "JobApplication" DROP COLUMN IF EXISTS "coverLetter";
ALTER TABLE "JobApplication" ALTER COLUMN "cvUrl" SET NOT NULL;
ALTER TABLE "JobApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JobApplication" ALTER COLUMN "status" TYPE "JobApplicationStatus" USING 'RECUE'::"JobApplicationStatus";
ALTER TABLE "JobApplication" ALTER COLUMN "status" SET DEFAULT 'RECUE';

-- Modifier JobPosting: supprimer location, ajouter nouveaux champs
ALTER TABLE "JobPosting" DROP COLUMN IF EXISTS "location";
ALTER TABLE "JobPosting" ADD COLUMN "city" TEXT;
ALTER TABLE "JobPosting" ADD COLUMN "province" TEXT;
ALTER TABLE "JobPosting" ADD COLUMN "domain" "MainDomain" NOT NULL DEFAULT 'AUTRE';
ALTER TABLE "JobPosting" ADD COLUMN "languages" "JobLanguage" NOT NULL DEFAULT 'FR';
ALTER TABLE "JobPosting" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "JobPosting" ADD COLUMN "deadline" TIMESTAMP(3);
ALTER TABLE "JobPosting" ALTER COLUMN "currency" SET DEFAULT 'CAD';

-- Modifier l'enum JobType: supprimer anciennes valeurs, ajouter nouvelles
-- Note: Cette migration suppose qu'il n'y a pas encore de JobPosting dans la base
-- Si des JobPostings existent, il faudra d'abord les convertir ou les supprimer

-- Créer le nouveau type
CREATE TYPE "JobType_new" AS ENUM ('STAGE', 'CDD', 'CDI', 'MISSION', 'FREELANCE');

-- Modifier la colonne pour utiliser le nouveau type
ALTER TABLE "JobPosting" ALTER COLUMN "jobType" DROP DEFAULT;
ALTER TABLE "JobPosting" ALTER COLUMN "jobType" TYPE "JobType_new" USING 
  CASE
    WHEN "jobType"::text = 'FULL_TIME' THEN 'CDI'::"JobType_new"
    WHEN "jobType"::text = 'PART_TIME' THEN 'CDD'::"JobType_new"
    WHEN "jobType"::text = 'CONTRACT' THEN 'MISSION'::"JobType_new"
    WHEN "jobType"::text = 'INTERNSHIP' THEN 'STAGE'::"JobType_new"
    WHEN "jobType"::text = 'TEMPORARY' THEN 'CDD'::"JobType_new"
    ELSE 'CDI'::"JobType_new"
  END;

-- Supprimer l'ancien type et renommer le nouveau
DROP TYPE "JobType";
ALTER TYPE "JobType_new" RENAME TO "JobType";

-- Remettre la valeur par défaut
ALTER TABLE "JobPosting" ALTER COLUMN "jobType" SET DEFAULT 'CDI';
