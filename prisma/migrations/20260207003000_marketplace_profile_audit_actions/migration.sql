-- Add marketplace profile audit actions

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REACTIVATE_PROFILE';
