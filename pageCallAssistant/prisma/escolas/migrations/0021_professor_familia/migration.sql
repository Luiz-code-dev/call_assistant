-- Migration 0021: professor indica reforço para a família e a família manda retorno à coordenação
-- Só acrescenta: duas tabelas novas.

CREATE TABLE IF NOT EXISTS "EduReforcoIndicado" (
    "id"             TEXT        NOT NULL,
    "networkId"      TEXT        NOT NULL,
    "envioId"        TEXT        NOT NULL,
    "teacherUserId"  TEXT        NOT NULL,
    "classSubjectId" TEXT        NOT NULL,
    "classId"        TEXT        NOT NULL,
    "studentId"      TEXT        NOT NULL,
    "subjectName"    TEXT        NOT NULL,
    "subjectCode"    TEXT,
    "text"           TEXT        NOT NULL,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "readAt"         TIMESTAMPTZ,
    "agendaAt"       TIMESTAMPTZ,
    CONSTRAINT "EduReforcoIndicado_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduReforcoIndicado_networkId_studentId_createdAt_idx" ON "EduReforcoIndicado"("networkId","studentId","createdAt");
CREATE INDEX IF NOT EXISTS "EduReforcoIndicado_networkId_teacherUserId_createdAt_idx" ON "EduReforcoIndicado"("networkId","teacherUserId","createdAt");
CREATE INDEX IF NOT EXISTS "EduReforcoIndicado_envioId_idx" ON "EduReforcoIndicado"("envioId");

CREATE TABLE IF NOT EXISTS "EduRetornoFamilia" (
    "id"             TEXT        NOT NULL,
    "networkId"      TEXT        NOT NULL,
    "guardianId"     TEXT        NOT NULL,
    "studentId"      TEXT        NOT NULL,
    "classId"        TEXT        NOT NULL,
    "schoolId"       TEXT        NOT NULL,
    "classSubjectId" TEXT        NOT NULL,
    "teacherUserId"  TEXT        NOT NULL,
    "kind"           TEXT        NOT NULL,
    "text"           TEXT        NOT NULL,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "readAt"         TIMESTAMPTZ,
    "readById"       TEXT,
    CONSTRAINT "EduRetornoFamilia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduRetornoFamilia_networkId_createdAt_idx" ON "EduRetornoFamilia"("networkId","createdAt");
CREATE INDEX IF NOT EXISTS "EduRetornoFamilia_networkId_teacherUserId_idx" ON "EduRetornoFamilia"("networkId","teacherUserId");
CREATE INDEX IF NOT EXISTS "EduRetornoFamilia_guardianId_createdAt_idx" ON "EduRetornoFamilia"("guardianId","createdAt");

ALTER TABLE "EduReforcoIndicado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduReforcoIndicado" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduReforcoIndicado" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduRetornoFamilia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduRetornoFamilia" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduRetornoFamilia" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
