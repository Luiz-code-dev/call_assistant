-- Migration 0020: revisão de 2 minutos do Flow (repetição espaçada)
-- Só acrescenta: uma tabela nova. Um cartão por aluno e pergunta de quiz que ele errou.

CREATE TABLE IF NOT EXISTS "EduReviewCard" (
    "id"             TEXT        NOT NULL,
    "networkId"      TEXT        NOT NULL,
    "studentId"      TEXT        NOT NULL,
    "questionId"     TEXT        NOT NULL,
    "activityId"     TEXT        NOT NULL,
    "subjectCode"    TEXT,
    "box"            INTEGER     NOT NULL DEFAULT 1,
    "dueOn"          TEXT        NOT NULL,
    "lastReviewedOn" TEXT,
    "reviews"        INTEGER     NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduReviewCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduReviewCard_studentId_questionId_key" ON "EduReviewCard"("studentId","questionId");
CREATE INDEX IF NOT EXISTS "EduReviewCard_networkId_studentId_dueOn_idx" ON "EduReviewCard"("networkId","studentId","dueOn");

ALTER TABLE "EduReviewCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduReviewCard" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduReviewCard" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
