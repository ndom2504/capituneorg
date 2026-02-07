-- Notifications Templates V1

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "role" "NotificationRole" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'INFO',
    "archivedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT NOT NULL,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationTemplate_archivedAt_createdAt_idx" ON "NotificationTemplate"("archivedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationTemplate_role_priority_createdAt_idx" ON "NotificationTemplate"("role", "priority", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationTemplate_type_idx" ON "NotificationTemplate"("type");
CREATE INDEX IF NOT EXISTS "NotificationTemplate_createdByAdminId_createdAt_idx" ON "NotificationTemplate"("createdByAdminId", "createdAt");

-- Add audit actions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_NOTIFICATION_TEMPLATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_NOTIFICATION_TEMPLATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ARCHIVE_NOTIFICATION_TEMPLATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESTORE_NOTIFICATION_TEMPLATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SEND_NOTIFICATION';
