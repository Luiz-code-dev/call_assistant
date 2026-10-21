-- AlterEnum: add EduAiStatus
CREATE TYPE "EduAiStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- AlterTable: add AI pipeline fields to EduSubmission
ALTER TABLE "EduSubmission"
  ADD COLUMN "aiStatus"    "EduAiStatus",
  ADD COLUMN "aiAttempts"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiLastError" TEXT;
