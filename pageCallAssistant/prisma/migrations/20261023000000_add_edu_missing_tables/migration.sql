-- Migration aditiva: tabelas e enums do EduEscolas que faltaram na migration inicial
-- Idempotente: IF NOT EXISTS em tabelas, DO/EXCEPTION em enums, ALTER IF NOT EXISTS em colunas

-- =========== Enums novos ===========
DO $$ BEGIN CREATE TYPE "EduInviteRole" AS ENUM ('PLATFORM_ADMIN', 'NETWORK_ADMIN', 'COORDINATOR', 'SCHOOL_ADMIN', 'TEACHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduImportKind" AS ENUM ('SCHOOLS', 'STAFF', 'STUDENTS', 'ASSIGNMENTS'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduImportStatus" AS ENUM ('UPLOADED', 'PREVIEW', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduStudentLoginMode" AS ENUM ('PIN', 'PICTURE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduActivityType" AS ENUM ('WRITTEN', 'SPOKEN', 'QUIZ'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduAiStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EduSubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'REVIEWED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== Colunas novas em tabelas existentes ===========
ALTER TABLE "EduClass" ADD COLUMN IF NOT EXISTS "defaultLoginMode" "EduStudentLoginMode" NOT NULL DEFAULT 'PIN';

ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "loginMode"           "EduStudentLoginMode" NOT NULL DEFAULT 'PIN';
ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "pictureSecretHash"   TEXT;
ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "cardVersion"         INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "guardianConsentAt"   TIMESTAMP(3);

-- =========== EduPlatformAdmin ===========
CREATE TABLE IF NOT EXISTS "EduPlatformAdmin" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduPlatformAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduPlatformAdmin_userId_key" ON "EduPlatformAdmin"("userId");
DO $$ BEGIN ALTER TABLE "EduPlatformAdmin" ADD CONSTRAINT "EduPlatformAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== EduAccountState ===========
CREATE TABLE IF NOT EXISTS "EduAccountState" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "passwordSetAt" TIMESTAMP(3),
    CONSTRAINT "EduAccountState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduAccountState_userId_key" ON "EduAccountState"("userId");
DO $$ BEGIN ALTER TABLE "EduAccountState" ADD CONSTRAINT "EduAccountState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== EduImportBatch ===========
CREATE TABLE IF NOT EXISTS "EduImportBatch" (
    "id"          TEXT NOT NULL,
    "networkId"   TEXT NOT NULL,
    "schoolId"    TEXT,
    "kind"        "EduImportKind"   NOT NULL,
    "status"      "EduImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName"    TEXT NOT NULL,
    "columnMap"   JSONB,
    "totalRows"   INTEGER NOT NULL DEFAULT 0,
    "processed"   INTEGER NOT NULL DEFAULT 0,
    "created"     INTEGER NOT NULL DEFAULT 0,
    "updated"     INTEGER NOT NULL DEFAULT 0,
    "failed"      INTEGER NOT NULL DEFAULT 0,
    "errors"      JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"  TIMESTAMP(3),
    CONSTRAINT "EduImportBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduImportBatch_networkId_createdAt_idx" ON "EduImportBatch"("networkId", "createdAt");
DO $$ BEGIN ALTER TABLE "EduImportBatch" ADD CONSTRAINT "EduImportBatch_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== EduInvite ===========
CREATE TABLE IF NOT EXISTS "EduInvite" (
    "id"          TEXT NOT NULL,
    "networkId"   TEXT,
    "schoolId"    TEXT,
    "email"       TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "role"        "EduInviteRole" NOT NULL,
    "tokenHash"   TEXT NOT NULL,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "acceptedAt"  TIMESTAMP(3),
    "userId"      TEXT,
    "sentCount"   INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduInvite_tokenHash_key" ON "EduInvite"("tokenHash");
CREATE INDEX IF NOT EXISTS "EduInvite_networkId_email_idx" ON "EduInvite"("networkId", "email");
DO $$ BEGIN ALTER TABLE "EduInvite" ADD CONSTRAINT "EduInvite_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== EduActivity ===========
CREATE TABLE IF NOT EXISTS "EduActivity" (
    "id"             TEXT NOT NULL,
    "networkId"      TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "topicId"        TEXT,
    "assessmentId"   TEXT,
    "type"           "EduActivityType"   NOT NULL,
    "title"          TEXT NOT NULL,
    "prompt"         TEXT NOT NULL,
    "rubric"         JSONB NOT NULL,
    "maxScore"       DECIMAL(5,2) NOT NULL DEFAULT 10,
    "maxAttempts"    INTEGER NOT NULL DEFAULT 2,
    "maxAudioSec"    INTEGER,
    "opensAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt"          TIMESTAMP(3),
    "status"         "EduActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById"    TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduActivity_classSubjectId_status_idx" ON "EduActivity"("classSubjectId", "status");
CREATE INDEX IF NOT EXISTS "EduActivity_networkId_status_idx" ON "EduActivity"("networkId", "status");
DO $$ BEGIN ALTER TABLE "EduActivity" ADD CONSTRAINT "EduActivity_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== EduQuizQuestion ===========
CREATE TABLE IF NOT EXISTS "EduQuizQuestion" (
    "id"           TEXT NOT NULL,
    "activityId"   TEXT NOT NULL,
    "order"        INTEGER NOT NULL,
    "question"     TEXT NOT NULL,
    "options"      JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation"  TEXT,
    CONSTRAINT "EduQuizQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduQuizQuestion_activityId_idx" ON "EduQuizQuestion"("activityId");
DO $$ BEGIN ALTER TABLE "EduQuizQuestion" ADD CONSTRAINT "EduQuizQuestion_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== EduSubmission ===========
CREATE TABLE IF NOT EXISTS "EduSubmission" (
    "id"           TEXT NOT NULL,
    "networkId"    TEXT NOT NULL,
    "activityId"   TEXT NOT NULL,
    "studentId"    TEXT NOT NULL,
    "attempt"      INTEGER NOT NULL,
    "status"       "EduSubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "text"         TEXT,
    "audioKey"     TEXT,
    "transcript"   TEXT,
    "quizAnswers"  JSONB,
    "aiScore"      DECIMAL(5,2),
    "aiFeedback"   JSONB,
    "teacherScore" DECIMAL(5,2),
    "teacherNote"  TEXT,
    "aiStatus"     "EduAiStatus",
    "aiAttempts"   INTEGER NOT NULL DEFAULT 0,
    "aiLastError"  TEXT,
    "aiCostMs"     INTEGER,
    "aiCostTokens" INTEGER,
    "submittedAt"  TIMESTAMP(3),
    "evaluatedAt"  TIMESTAMP(3),
    "reviewedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduSubmission_activityId_studentId_attempt_key" ON "EduSubmission"("activityId", "studentId", "attempt");
CREATE INDEX IF NOT EXISTS "EduSubmission_studentId_status_idx" ON "EduSubmission"("studentId", "status");
CREATE INDEX IF NOT EXISTS "EduSubmission_activityId_idx" ON "EduSubmission"("activityId");
DO $$ BEGIN ALTER TABLE "EduSubmission" ADD CONSTRAINT "EduSubmission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========== Recriar triggers de imutabilidade (idempotente) ===========
-- A migration original (20261020000001) pode ter aplicado parcialmente; garante estado correto.
DROP TRIGGER IF EXISTS edu_grade_entry_immutable ON "EduGradeEntry";
CREATE TRIGGER edu_grade_entry_immutable
  BEFORE UPDATE OR DELETE ON "EduGradeEntry"
  FOR EACH ROW EXECUTE FUNCTION edu_block_mutation();

DROP TRIGGER IF EXISTS edu_term_closure_immutable ON "EduTermClosure";
CREATE TRIGGER edu_term_closure_immutable
  BEFORE UPDATE OR DELETE ON "EduTermClosure"
  FOR EACH ROW EXECUTE FUNCTION edu_block_mutation();

DROP TRIGGER IF EXISTS edu_audit_log_immutable ON "EduAuditLog";
CREATE TRIGGER edu_audit_log_immutable
  BEFORE UPDATE OR DELETE ON "EduAuditLog"
  FOR EACH ROW EXECUTE FUNCTION edu_block_mutation();

-- =========== EduClassSession ===========
CREATE TABLE IF NOT EXISTS "EduClassSession" (
    "id"          TEXT NOT NULL,
    "networkId"   TEXT NOT NULL,
    "classId"     TEXT NOT NULL,
    "openedById"  TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "closedAt"    TIMESTAMP(3),
    CONSTRAINT "EduClassSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduClassSession_code_key" ON "EduClassSession"("code");
CREATE INDEX IF NOT EXISTS "EduClassSession_code_idx" ON "EduClassSession"("code");
CREATE INDEX IF NOT EXISTS "EduClassSession_networkId_idx" ON "EduClassSession"("networkId");
DO $$ BEGIN ALTER TABLE "EduClassSession" ADD CONSTRAINT "EduClassSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
