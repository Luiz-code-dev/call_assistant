-- Migration 0018: avisos do reforço para o responsável
-- Só acrescenta: duas tabelas novas e duas colunas novas em EduGuardian.

ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "whatsappOptInAt" TIMESTAMPTZ;
ALTER TABLE "EduGuardian" ADD COLUMN IF NOT EXISTS "emailAlertsOff" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "EduGuardianPushSubscription" (
    "id"         TEXT        NOT NULL,
    "networkId"  TEXT        NOT NULL,
    "guardianId" TEXT        NOT NULL,
    "endpoint"   TEXT        NOT NULL,
    "p256dh"     TEXT        NOT NULL,
    "auth"       TEXT        NOT NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduGuardianPushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduGuardianPushSubscription_endpoint_key" ON "EduGuardianPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "EduGuardianPushSubscription_networkId_guardianId_idx" ON "EduGuardianPushSubscription"("networkId","guardianId");

CREATE TABLE IF NOT EXISTS "EduGuardianAlert" (
    "id"         TEXT        NOT NULL,
    "networkId"  TEXT        NOT NULL,
    "guardianId" TEXT        NOT NULL,
    "studentId"  TEXT        NOT NULL,
    "kind"       TEXT        NOT NULL,
    "day"        TEXT        NOT NULL,
    "title"      TEXT        NOT NULL,
    "body"       TEXT        NOT NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduGuardianAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduGuardianAlert_guardianId_studentId_kind_day_key" ON "EduGuardianAlert"("guardianId","studentId","kind","day");
CREATE INDEX IF NOT EXISTS "EduGuardianAlert_networkId_studentId_idx" ON "EduGuardianAlert"("networkId","studentId");

ALTER TABLE "EduGuardianPushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGuardianPushSubscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGuardianPushSubscription" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduGuardianAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGuardianAlert" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGuardianAlert" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- Permissões: provisionAppRole em migrate-all.mjs
