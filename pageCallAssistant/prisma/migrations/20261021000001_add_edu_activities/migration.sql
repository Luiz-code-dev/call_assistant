-- Migration: add_edu_activities
-- Adds EduActivity, EduQuizQuestion, EduSubmission and related enums

CREATE TYPE "EduActivityType" AS ENUM ('WRITTEN', 'SPOKEN', 'QUIZ');
CREATE TYPE "EduActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "EduSubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'REVIEWED');

CREATE TABLE "EduActivity" (
  "id"             TEXT NOT NULL,
  "networkId"      TEXT NOT NULL,
  "classSubjectId" TEXT NOT NULL,
  "topicId"        TEXT,
  "assessmentId"   TEXT,
  "type"           "EduActivityType" NOT NULL,
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
CREATE INDEX "EduActivity_classSubjectId_status_idx" ON "EduActivity"("classSubjectId", "status");
CREATE INDEX "EduActivity_networkId_status_idx" ON "EduActivity"("networkId", "status");
ALTER TABLE "EduActivity"
  ADD CONSTRAINT "EduActivity_classSubjectId_fkey"
  FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EduQuizQuestion" (
  "id"           TEXT NOT NULL,
  "activityId"   TEXT NOT NULL,
  "order"        INTEGER NOT NULL,
  "question"     TEXT NOT NULL,
  "options"      JSONB NOT NULL,
  "correctIndex" INTEGER NOT NULL,
  "explanation"  TEXT,
  CONSTRAINT "EduQuizQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EduQuizQuestion_activityId_idx" ON "EduQuizQuestion"("activityId");
ALTER TABLE "EduQuizQuestion"
  ADD CONSTRAINT "EduQuizQuestion_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EduSubmission" (
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
  "aiCostMs"     INTEGER,
  "aiCostTokens" INTEGER,
  "submittedAt"  TIMESTAMP(3),
  "evaluatedAt"  TIMESTAMP(3),
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduSubmission_activityId_studentId_attempt_key"
  ON "EduSubmission"("activityId", "studentId", "attempt");
CREATE INDEX "EduSubmission_studentId_status_idx" ON "EduSubmission"("studentId", "status");
CREATE INDEX "EduSubmission_activityId_idx" ON "EduSubmission"("activityId");
ALTER TABLE "EduSubmission"
  ADD CONSTRAINT "EduSubmission_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
