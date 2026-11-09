-- Migration 0014: degrau por aluno
-- Adiciona campos para armazenar questoes do degrau na sessao do aluno
-- (nunca no EduDiagnosticItem compartilhado).
-- Tambem adiciona role ao EduDiagnosticItem para banco do degrau.

ALTER TABLE "EduAttemptSession"
  ADD COLUMN IF NOT EXISTS "extraItems" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "EduDiagnosticItem"
  ADD COLUMN IF NOT EXISTS "role"           TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "isDegrauLegacy" BOOLEAN NOT NULL DEFAULT false;

-- Marca itens de degrau legados (criados pela logica antiga)
UPDATE "EduDiagnosticItem"
  SET "isDegrauLegacy" = true
  WHERE "id" LIKE 'DEGRAU-%';

-- Trackeamento de modo de atribuicao: padrao passa para AUTO
ALTER TABLE "EduNetwork"
  ALTER COLUMN "trackAssignmentMode" SET DEFAULT 'AUTO';

UPDATE "EduNetwork"
  SET "trackAssignmentMode" = 'AUTO'
  WHERE "trackAssignmentMode" = 'SUGGEST' OR "trackAssignmentMode" IS NULL;
