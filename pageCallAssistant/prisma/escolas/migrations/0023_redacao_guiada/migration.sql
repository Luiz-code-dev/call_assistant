-- Migration 0023: redação guiada (propostas do professor e textos dos alunos)
-- Só acrescenta: duas tabelas novas, com isolamento por rede (RLS).

CREATE TABLE IF NOT EXISTS "EduEssayPrompt" (
    "id"           TEXT        NOT NULL,
    "networkId"    TEXT        NOT NULL,
    "schoolId"     TEXT        NOT NULL,
    "classId"      TEXT        NOT NULL,
    "createdById"  TEXT        NOT NULL,
    "title"        TEXT        NOT NULL,
    "instructions" TEXT        NOT NULL,
    "genre"        TEXT        NOT NULL,
    "minWords"     INTEGER     NOT NULL DEFAULT 60,
    "maxWords"     INTEGER     NOT NULL DEFAULT 400,
    "maxVersions"  INTEGER     NOT NULL DEFAULT 3,
    "dueAt"        TIMESTAMPTZ,
    "isOpen"       BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduEssayPrompt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduEssayPrompt_networkId_classId_isOpen_idx" ON "EduEssayPrompt"("networkId","classId","isOpen");

CREATE TABLE IF NOT EXISTS "EduEssay" (
    "id"            TEXT        NOT NULL,
    "networkId"     TEXT        NOT NULL,
    "promptId"      TEXT        NOT NULL,
    "studentId"     TEXT        NOT NULL,
    "version"       INTEGER     NOT NULL,
    "status"        TEXT        NOT NULL DEFAULT 'DRAFT',
    "text"          TEXT        NOT NULL,
    "wordCount"     INTEGER     NOT NULL DEFAULT 0,
    "aiStatus"      TEXT,
    "aiFeedback"    JSONB,
    "aiError"       TEXT,
    "aiTokens"      INTEGER,
    "teacherReview" JSONB,
    "reviewedById"  TEXT,
    "submittedAt"   TIMESTAMPTZ,
    "feedbackAt"    TIMESTAMPTZ,
    "reviewedAt"    TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduEssay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduEssay_promptId_studentId_version_key" ON "EduEssay"("promptId","studentId","version");
CREATE INDEX IF NOT EXISTS "EduEssay_studentId_status_idx" ON "EduEssay"("studentId","status");
CREATE INDEX IF NOT EXISTS "EduEssay_networkId_promptId_idx" ON "EduEssay"("networkId","promptId");

DO $$ BEGIN
  ALTER TABLE "EduEssay" ADD CONSTRAINT "EduEssay_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EduEssayPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "EduEssayPrompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduEssayPrompt" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rede ON "EduEssayPrompt";
CREATE POLICY rede ON "EduEssayPrompt" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduEssay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduEssay" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rede ON "EduEssay";
CREATE POLICY rede ON "EduEssay" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
