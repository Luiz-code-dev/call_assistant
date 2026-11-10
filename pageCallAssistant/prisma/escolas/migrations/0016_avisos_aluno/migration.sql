-- Migration 0016: avisos (push) para o aluno e controle do lembrete da agenda
-- Só acrescenta: tabela nova e uma coluna nova.

CREATE TABLE IF NOT EXISTS "EduPushSubscription" (
    "id"        TEXT        NOT NULL,
    "networkId" TEXT        NOT NULL,
    "studentId" TEXT        NOT NULL,
    "endpoint"  TEXT        NOT NULL,
    "p256dh"    TEXT        NOT NULL,
    "auth"      TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduPushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduPushSubscription_endpoint_key" ON "EduPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "EduPushSubscription_networkId_studentId_idx" ON "EduPushSubscription"("networkId","studentId");

ALTER TABLE "EduPushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduPushSubscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduPushSubscription" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- Dia (AAAA-MM-DD, fuso de São Paulo) em que o lembrete deste horário já foi enviado
ALTER TABLE "EduStudyPlanItem" ADD COLUMN IF NOT EXISTS "lastNotifiedOn" TEXT;

-- Horários repetidos (mesmo dia e mesma hora) criados antes da trava: fica só o mais antigo
UPDATE "EduStudyPlanItem" i SET "isActive" = false
WHERE i."isActive" = true AND EXISTS (
  SELECT 1 FROM "EduStudyPlanItem" o
  WHERE o."isActive" = true AND o."networkId" = i."networkId" AND o."studentId" = i."studentId"
    AND o."weekday" = i."weekday" AND o."time" = i."time"
    AND (o."createdAt" < i."createdAt" OR (o."createdAt" = i."createdAt" AND o."id" < i."id"))
);

-- Permissões: provisionAppRole em migrate-all.mjs
