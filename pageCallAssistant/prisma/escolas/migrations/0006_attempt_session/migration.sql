-- Migration 0006: EduAttemptSession (I1-I8 integridade de tentativa)
-- Uma linha por sessão aluno × atividade, permitindo retomar, embaralhar e
-- controlar tempo mínimo por questão sem confiar no cliente.

CREATE TABLE IF NOT EXISTS "EduAttemptSession" (
    "id"               TEXT        NOT NULL,
    "networkId"        TEXT        NOT NULL,
    "studentId"        TEXT        NOT NULL,
    "activityId"       TEXT        NOT NULL,
    "diagnosticId"     TEXT,
    "currentQuestion"  INTEGER     NOT NULL DEFAULT 0,
    "answers"          JSONB       NOT NULL DEFAULT '[]',
    "shuffleOrder"     JSONB       NOT NULL DEFAULT '[]',
    "minMsPerQuestion" INTEGER     NOT NULL DEFAULT 5000,
    "variantId"        TEXT,
    "startedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "lastActivityAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expiresAt"        TIMESTAMPTZ NOT NULL,
    "completedAt"      TIMESTAMPTZ,
    "resumeToken"      TEXT        UNIQUE,
    CONSTRAINT "EduAttemptSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EduAttemptSession_studentId_activityId_diagnosticId_key"
    ON "EduAttemptSession"("studentId","activityId","diagnosticId");

CREATE INDEX IF NOT EXISTS "EduAttemptSession_networkId_studentId_idx"
    ON "EduAttemptSession"("networkId","studentId");

CREATE INDEX IF NOT EXISTS "EduAttemptSession_networkId_activityId_idx"
    ON "EduAttemptSession"("networkId","activityId");

-- RLS: aluno vê e altera só as próprias sessões; equipe escolar lê da rede
ALTER TABLE "EduAttemptSession" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessao_leitura" ON "EduAttemptSession"
    FOR SELECT USING (
        "networkId" = current_setting('app.network_id', true)
    );

CREATE POLICY "sessao_escrita" ON "EduAttemptSession"
    FOR ALL USING (
        "networkId" = current_setting('app.network_id', true)
    );

-- escolas_app pode ler e escrever na própria rede
GRANT SELECT, INSERT, UPDATE, DELETE ON "EduAttemptSession" TO escolas_app;
