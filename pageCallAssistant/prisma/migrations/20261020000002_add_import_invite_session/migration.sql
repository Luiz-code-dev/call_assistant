-- ================================================================
-- Migration: EduImportBatch, EduInvite, EduClassSession
-- New enums, new models, field additions to existing tables
-- Additive only — no destructive changes
-- ================================================================

-- New enums
DO $$ BEGIN
  CREATE TYPE "EduImportKind" AS ENUM ('SCHOOLS', 'STAFF', 'STUDENTS', 'ASSIGNMENTS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EduImportStatus" AS ENUM ('UPLOADED', 'PREVIEW', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EduStudentLoginMode" AS ENUM ('PIN', 'PICTURE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New fields on EduStudent
ALTER TABLE "EduStudent"
  ADD COLUMN IF NOT EXISTS "loginMode" "EduStudentLoginMode" NOT NULL DEFAULT 'PIN',
  ADD COLUMN IF NOT EXISTS "pictureSecretHash" TEXT,
  ADD COLUMN IF NOT EXISTS "cardVersion" INTEGER NOT NULL DEFAULT 1;

-- New field on EduClass
ALTER TABLE "EduClass"
  ADD COLUMN IF NOT EXISTS "defaultLoginMode" "EduStudentLoginMode" NOT NULL DEFAULT 'PIN';

-- Nullable termId on EduAssessment (was NOT NULL)
ALTER TABLE "EduAssessment"
  ALTER COLUMN "termId" DROP NOT NULL;

-- Note field on EduGradeEntry
ALTER TABLE "EduGradeEntry"
  ADD COLUMN IF NOT EXISTS "note" TEXT;

-- EduImportBatch table
CREATE TABLE IF NOT EXISTS "EduImportBatch" (
  "id"          TEXT NOT NULL,
  "networkId"   TEXT NOT NULL,
  "schoolId"    TEXT,
  "kind"        "EduImportKind" NOT NULL,
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
  CONSTRAINT "EduImportBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EduImportBatch_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EduImportBatch_networkId_createdAt_idx" ON "EduImportBatch"("networkId", "createdAt");

-- EduInvite table
CREATE TABLE IF NOT EXISTS "EduInvite" (
  "id"          TEXT NOT NULL,
  "networkId"   TEXT NOT NULL,
  "schoolId"    TEXT,
  "email"       TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "role"        "EduRole" NOT NULL,
  "tokenHash"   TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "acceptedAt"  TIMESTAMP(3),
  "userId"      TEXT,
  "sentCount"   INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduInvite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EduInvite_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "EduInvite_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EduInvite_networkId_email_idx" ON "EduInvite"("networkId", "email");

-- EduClassSession table
CREATE TABLE IF NOT EXISTS "EduClassSession" (
  "id"         TEXT NOT NULL,
  "networkId"  TEXT NOT NULL,
  "classId"    TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "code"       TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "closedAt"   TIMESTAMP(3),
  CONSTRAINT "EduClassSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EduClassSession_code_key" UNIQUE ("code"),
  CONSTRAINT "EduClassSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EduClassSession_code_idx" ON "EduClassSession"("code");
CREATE INDEX IF NOT EXISTS "EduClassSession_networkId_idx" ON "EduClassSession"("networkId");
