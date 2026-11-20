-- Migration 0022: integrações externas (chaves de acesso, histórico e avisos a sistemas externos)
-- Só acrescenta: quatro tabelas novas, todas com isolamento por rede (RLS).

CREATE TABLE IF NOT EXISTS "EduIntegrationKey" (
    "id"          TEXT        NOT NULL,
    "networkId"   TEXT        NOT NULL,
    "name"        TEXT        NOT NULL,
    "prefix"      TEXT        NOT NULL,
    "keyHash"     TEXT        NOT NULL,
    "scopes"      TEXT[],
    "allowedIps"  TEXT[],
    "fieldMap"    JSONB,
    "createdById" TEXT        NOT NULL,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expiresAt"   TIMESTAMPTZ,
    "lastUsedAt"  TIMESTAMPTZ,
    "revokedAt"   TIMESTAMPTZ,
    CONSTRAINT "EduIntegrationKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduIntegrationKey_keyHash_key" ON "EduIntegrationKey"("keyHash");
CREATE INDEX IF NOT EXISTS "EduIntegrationKey_networkId_createdAt_idx" ON "EduIntegrationKey"("networkId","createdAt");

CREATE TABLE IF NOT EXISTS "EduIntegrationLog" (
    "id"        TEXT        NOT NULL,
    "networkId" TEXT        NOT NULL,
    "keyId"     TEXT,
    "direction" TEXT        NOT NULL,
    "resource"  TEXT        NOT NULL,
    "status"    TEXT        NOT NULL,
    "received"  INTEGER     NOT NULL DEFAULT 0,
    "created"   INTEGER     NOT NULL DEFAULT 0,
    "updated"   INTEGER     NOT NULL DEFAULT 0,
    "failed"    INTEGER     NOT NULL DEFAULT 0,
    "errors"    JSONB,
    "ip"        TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduIntegrationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduIntegrationLog_networkId_createdAt_idx" ON "EduIntegrationLog"("networkId","createdAt");

CREATE TABLE IF NOT EXISTS "EduWebhookEndpoint" (
    "id"             TEXT        NOT NULL,
    "networkId"      TEXT        NOT NULL,
    "url"            TEXT        NOT NULL,
    "secretEnc"      TEXT        NOT NULL,
    "events"         TEXT[],
    "isActive"       BOOLEAN     NOT NULL DEFAULT true,
    "failCount"      INTEGER     NOT NULL DEFAULT 0,
    "createdById"    TEXT        NOT NULL,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "lastDeliveryAt" TIMESTAMPTZ,
    "lastStatus"     TEXT,
    CONSTRAINT "EduWebhookEndpoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduWebhookEndpoint_networkId_isActive_idx" ON "EduWebhookEndpoint"("networkId","isActive");

CREATE TABLE IF NOT EXISTS "EduWebhookDelivery" (
    "id"           TEXT        NOT NULL,
    "networkId"    TEXT        NOT NULL,
    "endpointId"   TEXT        NOT NULL,
    "event"        TEXT        NOT NULL,
    "payload"      JSONB       NOT NULL,
    "status"       TEXT        NOT NULL,
    "attempts"     INTEGER     NOT NULL DEFAULT 0,
    "responseCode" INTEGER,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deliveredAt"  TIMESTAMPTZ,
    CONSTRAINT "EduWebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduWebhookDelivery_networkId_createdAt_idx" ON "EduWebhookDelivery"("networkId","createdAt");
CREATE INDEX IF NOT EXISTS "EduWebhookDelivery_endpointId_createdAt_idx" ON "EduWebhookDelivery"("endpointId","createdAt");

ALTER TABLE "EduIntegrationKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduIntegrationKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduIntegrationKey" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduIntegrationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduIntegrationLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduIntegrationLog" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduWebhookEndpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduWebhookEndpoint" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduWebhookEndpoint" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduWebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduWebhookDelivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduWebhookDelivery" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
