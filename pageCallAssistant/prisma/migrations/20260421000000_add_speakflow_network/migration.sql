-- ============================================================
-- SpeakFlow Network / Circle — migration aditiva
-- Não modifica nenhuma tabela existente de forma destrutiva.
-- ============================================================

-- AlterTable: adicionar avatarUrl opcional ao User
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- CreateTable: Circle
CREATE TABLE "Circle" (
    "id"          TEXT        NOT NULL,
    "ownerId"     TEXT        NOT NULL,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "focus"       TEXT        NOT NULL,
    "level"       TEXT        NOT NULL DEFAULT 'Todos',
    "visibility"  TEXT        NOT NULL DEFAULT 'public',
    "maxMembers"  INTEGER     NOT NULL DEFAULT 20,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CircleMember
CREATE TABLE "CircleMember" (
    "id"       TEXT        NOT NULL,
    "circleId" TEXT        NOT NULL,
    "userId"   TEXT        NOT NULL,
    "role"     TEXT        NOT NULL DEFAULT 'member',
    "status"   TEXT        NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Challenge
CREATE TABLE "Challenge" (
    "id"          TEXT        NOT NULL,
    "circleId"    TEXT        NOT NULL,
    "title"       TEXT        NOT NULL,
    "prompt"      TEXT        NOT NULL,
    "type"        TEXT        NOT NULL DEFAULT 'written',
    "startsAt"    TIMESTAMP(3) NOT NULL,
    "endsAt"      TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Submission
CREATE TABLE "Submission" (
    "id"          TEXT        NOT NULL,
    "userId"      TEXT        NOT NULL,
    "challengeId" TEXT        NOT NULL,
    "circleId"    TEXT        NOT NULL,
    "content"     TEXT        NOT NULL,
    "isPublic"    BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SubmissionEvaluation
CREATE TABLE "SubmissionEvaluation" (
    "id"               TEXT        NOT NULL,
    "submissionId"     TEXT        NOT NULL,
    "fluencyScore"     INTEGER     NOT NULL,
    "contentScore"     INTEGER     NOT NULL,
    "clarityScore"     INTEGER     NOT NULL,
    "totalScore"       INTEGER     NOT NULL,
    "feedback"         TEXT        NOT NULL,
    "improvedResponse" TEXT        NOT NULL,
    "tip"              TEXT        NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionEvaluation_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
ALTER TABLE "CircleMember"        ADD CONSTRAINT "CircleMember_circleId_userId_key"  UNIQUE ("circleId", "userId");
ALTER TABLE "Submission"          ADD CONSTRAINT "Submission_userId_challengeId_key"  UNIQUE ("userId", "challengeId");
ALTER TABLE "SubmissionEvaluation" ADD CONSTRAINT "SubmissionEvaluation_submissionId_key" UNIQUE ("submissionId");

-- Foreign Keys: CircleMember
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys: Challenge
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys: Submission
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys: SubmissionEvaluation
ALTER TABLE "SubmissionEvaluation" ADD CONSTRAINT "SubmissionEvaluation_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes para queries de ranking e feed
CREATE INDEX "CircleMember_userId_idx"       ON "CircleMember"("userId");
CREATE INDEX "CircleMember_circleId_idx"     ON "CircleMember"("circleId");
CREATE INDEX "Challenge_circleId_endsAt_idx" ON "Challenge"("circleId", "endsAt");
CREATE INDEX "Submission_challengeId_idx"    ON "Submission"("challengeId");
CREATE INDEX "Submission_circleId_idx"       ON "Submission"("circleId");
CREATE INDEX "SubmissionEvaluation_totalScore_idx" ON "SubmissionEvaluation"("totalScore");
