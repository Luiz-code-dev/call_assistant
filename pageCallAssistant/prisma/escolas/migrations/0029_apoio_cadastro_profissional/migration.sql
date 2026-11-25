-- Migration 0029: perfil "profissional de apoio" (assistente social e psicólogo) e o cadastro com registro no conselho.
-- Só acrescenta: um valor novo nos tipos de perfil e uma tabela nova, com isolamento por rede (RLS).

ALTER TYPE "EduRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "EduInviteRole" ADD VALUE IF NOT EXISTS 'SUPPORT';

CREATE TABLE IF NOT EXISTS "EduApoioCadastro" (
    "id"             TEXT        NOT NULL,
    "networkId"      TEXT        NOT NULL,
    "inviteId"       TEXT,
    "userId"         TEXT,
    "email"          TEXT        NOT NULL,
    "name"           TEXT        NOT NULL,
    "funcao"         TEXT        NOT NULL,
    "conselho"       TEXT        NOT NULL,
    "registro"       TEXT        NOT NULL,
    "uf"             TEXT        NOT NULL,
    "schoolIds"      TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "verificacao"    TEXT        NOT NULL DEFAULT 'DECLARADO',
    "situacaoNoConselho" TEXT,
    "declaradoPorId" TEXT        NOT NULL,
    "declaradoEm"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "status"         TEXT        NOT NULL DEFAULT 'CONVIDADO',
    "termoVersao"    TEXT,
    "termoAceitoEm"  TIMESTAMPTZ,
    "recusadoEm"     TIMESTAMPTZ,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduApoioCadastro_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduApoioCadastro_inviteId_key" ON "EduApoioCadastro"("inviteId");
CREATE INDEX IF NOT EXISTS "EduApoioCadastro_networkId_status_idx" ON "EduApoioCadastro"("networkId","status");
CREATE INDEX IF NOT EXISTS "EduApoioCadastro_networkId_userId_idx" ON "EduApoioCadastro"("networkId","userId");

ALTER TABLE "EduApoioCadastro" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduApoioCadastro" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rede ON "EduApoioCadastro";
CREATE POLICY rede ON "EduApoioCadastro" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
