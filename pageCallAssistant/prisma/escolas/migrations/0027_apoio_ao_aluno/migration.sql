-- Migration 0027: canal de apoio ao aluno (pedido de ajuda lido só pela equipe indicada pela secretaria).
-- Só acrescenta: duas colunas na rede e duas tabelas novas, com isolamento por rede (RLS).

ALTER TABLE "EduNetwork" ADD COLUMN IF NOT EXISTS "apoioAtivo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EduNetwork" ADD COLUMN IF NOT EXISTS "apoioAnoMinimo" INTEGER NOT NULL DEFAULT 6;

CREATE TABLE IF NOT EXISTS "EduEquipeApoio" (
    "id"        TEXT        NOT NULL,
    "networkId" TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "addedById" TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduEquipeApoio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduEquipeApoio_networkId_userId_key" ON "EduEquipeApoio"("networkId","userId");

CREATE TABLE IF NOT EXISTS "EduPedidoApoio" (
    "id"              TEXT        NOT NULL,
    "networkId"       TEXT        NOT NULL,
    "studentId"       TEXT        NOT NULL,
    "classId"         TEXT,
    "schoolId"        TEXT,
    "assunto"         TEXT        NOT NULL,
    "text"            TEXT,
    "audioKey"        TEXT,
    "status"          TEXT        NOT NULL DEFAULT 'RECEBIDO',
    "observacao"      TEXT,
    "encaminhadoPara" TEXT,
    "vistoAt"         TIMESTAMPTZ,
    "vistoPorId"      TEXT,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduPedidoApoio_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduPedidoApoio_networkId_status_createdAt_idx" ON "EduPedidoApoio"("networkId","status","createdAt");
CREATE INDEX IF NOT EXISTS "EduPedidoApoio_studentId_createdAt_idx" ON "EduPedidoApoio"("studentId","createdAt");

ALTER TABLE "EduEquipeApoio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduEquipeApoio" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rede ON "EduEquipeApoio";
CREATE POLICY rede ON "EduEquipeApoio" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduPedidoApoio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduPedidoApoio" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rede ON "EduPedidoApoio";
CREATE POLICY rede ON "EduPedidoApoio" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
