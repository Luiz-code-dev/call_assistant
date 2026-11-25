-- Migration 0028: equipe de apoio com função e escolas atendidas; desfecho e comunicação às autoridades no pedido.
-- Só acrescenta colunas.

ALTER TABLE "EduEquipeApoio" ADD COLUMN IF NOT EXISTS "funcao" TEXT NOT NULL DEFAULT 'INDICADO';
ALTER TABLE "EduEquipeApoio" ADD COLUMN IF NOT EXISTS "schoolIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "EduPedidoApoio" ADD COLUMN IF NOT EXISTS "desfecho" TEXT;
ALTER TABLE "EduPedidoApoio" ADD COLUMN IF NOT EXISTS "comunicadoA" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "EduPedidoApoio" ADD COLUMN IF NOT EXISTS "comunicadoEm" TIMESTAMPTZ;
ALTER TABLE "EduPedidoApoio" ADD COLUMN IF NOT EXISTS "responsavelId" TEXT;
ALTER TABLE "EduPedidoApoio" ADD COLUMN IF NOT EXISTS "concluidoEm" TIMESTAMPTZ;
