-- Migration: EduActivity biblioteca global (classSubjectId e networkId nullable)
-- Atividades com classSubjectId = NULL sao conteudo de biblioteca SpeakFlow global,
-- acessiveis via atribuicao de trilha, sem precisar de turma-componente especifica.
-- Adiciona tambem os campos source e reviewNote para rastrear origem e estado de revisao.

ALTER TABLE "EduActivity" ALTER COLUMN "classSubjectId" DROP NOT NULL;
ALTER TABLE "EduActivity" ALTER COLUMN "networkId" DROP NOT NULL;

ALTER TABLE "EduActivity" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "EduActivity" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;

-- Remove FK que exigia classSubjectId nao nulo; recria como nullable
DO $$ BEGIN
  ALTER TABLE "EduActivity" DROP CONSTRAINT IF EXISTS "EduActivity_classSubjectId_fkey";
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EduActivity"
    ADD CONSTRAINT "EduActivity_classSubjectId_fkey"
    FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Recria indice (funciona com NULL)
DROP INDEX IF EXISTS "EduActivity_classSubjectId_status_idx";
CREATE INDEX "EduActivity_classSubjectId_status_idx" ON "EduActivity"("classSubjectId", "status");
