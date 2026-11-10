-- Migration 0015: recados da família para o aluno e agenda de estudos
-- Só acrescenta tabelas novas. A família escreve; o aluno lê na tela inicial.

CREATE TABLE IF NOT EXISTS "EduFamilyMessage" (
    "id"         TEXT        NOT NULL,
    "networkId"  TEXT        NOT NULL,
    "guardianId" TEXT        NOT NULL,
    "studentId"  TEXT        NOT NULL,
    "kind"       TEXT        NOT NULL DEFAULT 'LEMBRETE',
    "text"       TEXT        NOT NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "readAt"     TIMESTAMPTZ,
    CONSTRAINT "EduFamilyMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduFamilyMessage_networkId_studentId_createdAt_idx"
    ON "EduFamilyMessage"("networkId","studentId","createdAt");

CREATE TABLE IF NOT EXISTS "EduStudyPlanItem" (
    "id"          TEXT        NOT NULL,
    "networkId"   TEXT        NOT NULL,
    "guardianId"  TEXT        NOT NULL,
    "studentId"   TEXT        NOT NULL,
    "weekday"     INTEGER     NOT NULL,
    "time"        TEXT        NOT NULL,
    "subjectCode" TEXT,
    "minutes"     INTEGER     NOT NULL DEFAULT 20,
    "isActive"    BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduStudyPlanItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduStudyPlanItem_networkId_studentId_idx"
    ON "EduStudyPlanItem"("networkId","studentId");

ALTER TABLE "EduFamilyMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduFamilyMessage" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduFamilyMessage" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduStudyPlanItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduStudyPlanItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduStudyPlanItem" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- Permissões: provisionAppRole em migrate-all.mjs (GRANT ON ALL TABLES + ALTER DEFAULT PRIVILEGES)
