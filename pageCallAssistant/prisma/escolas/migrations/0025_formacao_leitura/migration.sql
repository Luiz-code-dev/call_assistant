-- Migration 0025: leitura dos livros de formação pela equipe (capítulos lidos, avaliação e selo).
-- Só acrescenta: uma tabela nova, com isolamento por rede (RLS).

CREATE TABLE IF NOT EXISTS "EduFormacaoLeitura" (
    "id"               TEXT        NOT NULL,
    "networkId"        TEXT        NOT NULL,
    "userId"           TEXT        NOT NULL,
    "livroSlug"        TEXT        NOT NULL,
    "capitulosLidos"   TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ultimoCapitulo"   TEXT,
    "avaliacaoAcertos" INTEGER,
    "avaliacaoTotal"   INTEGER,
    "concluidoEm"      TIMESTAMPTZ,
    "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "EduFormacaoLeitura_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduFormacaoLeitura_userId_livroSlug_key" ON "EduFormacaoLeitura"("userId","livroSlug");
CREATE INDEX IF NOT EXISTS "EduFormacaoLeitura_networkId_userId_idx" ON "EduFormacaoLeitura"("networkId","userId");

ALTER TABLE "EduFormacaoLeitura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduFormacaoLeitura" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rede ON "EduFormacaoLeitura";
CREATE POLICY rede ON "EduFormacaoLeitura" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));
