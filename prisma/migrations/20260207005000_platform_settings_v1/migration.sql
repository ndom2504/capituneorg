-- Platform settings (key/value) + audit action

-- 1) Add audit action
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_PLATFORM_SETTING';

-- 2) PlatformSetting table
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedByAdminId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- 3) Foreign key
ALTER TABLE "PlatformSetting"
  ADD CONSTRAINT "PlatformSetting_updatedByAdminId_fkey"
  FOREIGN KEY ("updatedByAdminId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PlatformSetting_updatedByAdminId_updatedAt_idx"
  ON "PlatformSetting"("updatedByAdminId", "updatedAt");
