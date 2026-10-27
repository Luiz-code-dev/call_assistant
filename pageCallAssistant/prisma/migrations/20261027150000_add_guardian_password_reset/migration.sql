-- Redefinicao de senha da familia por e-mail (aditivo).
ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "resetTokenHash" TEXT;
ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "resetTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "EduGuardian_resetTokenHash_key" ON "EduGuardian"("resetTokenHash");
