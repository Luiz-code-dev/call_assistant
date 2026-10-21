-- CreateTable: QuizQuestion
-- Stores the questions for quiz-type challenges
CREATE TABLE IF NOT EXISTS "QuizQuestion" (
    "id"           TEXT        NOT NULL,
    "challengeId"  TEXT        NOT NULL,
    "question"     TEXT        NOT NULL,
    "options"      TEXT        NOT NULL,
    "correctIndex" INTEGER     NOT NULL,
    "orderIndex"   INTEGER     NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- Foreign Key
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for fetching questions ordered by position
CREATE INDEX IF NOT EXISTS "QuizQuestion_challengeId_orderIndex_idx"
    ON "QuizQuestion"("challengeId", "orderIndex");
