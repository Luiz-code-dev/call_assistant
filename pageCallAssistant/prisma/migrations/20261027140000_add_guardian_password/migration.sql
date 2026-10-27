-- Login da familia por e-mail/celular + senha (aditivo).
ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "loginFailedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "loginLockedUntil" TIMESTAMP(3);
