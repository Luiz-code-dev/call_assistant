CREATE TABLE "ProficiencyAssessment" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "level"           TEXT NOT NULL,
  "levelLabel"      TEXT NOT NULL,
  "confidence"      TEXT NOT NULL,
  "fluencyAvg"      DOUBLE PRECISION NOT NULL,
  "contentAvg"      DOUBLE PRECISION NOT NULL,
  "clarityAvg"      DOUBLE PRECISION NOT NULL,
  "totalAvg"        DOUBLE PRECISION NOT NULL,
  "reasoning"       TEXT NOT NULL,
  "strengths"       TEXT NOT NULL,
  "improvements"    TEXT NOT NULL,
  "overallFeedback" TEXT NOT NULL,
  "submissionsUsed" INTEGER NOT NULL,
  "isEligible"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProficiencyAssessment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProficiencyAssessment"
  ADD CONSTRAINT "ProficiencyAssessment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
