-- Migration 0009: ajustes de esquema — alinha banco com schema.prisma
-- Todas as operações são idempotentes ou seguras de repetir.

-- ── 1. Remover defaults de array que não estão declarados no schema ─────────
-- Prisma não usa DEFAULT no banco para Int[] / String[] sem @default().
-- O padrão foi adicionado em 0003 mas não corresponde ao schema atual.
ALTER TABLE "EduActivity"         ALTER COLUMN "gradeYears"        DROP DEFAULT;
ALTER TABLE "EduActivity"         ALTER COLUMN "skillIds"          DROP DEFAULT;
ALTER TABLE "EduLesson"           ALTER COLUMN "skillIds"          DROP DEFAULT;
ALTER TABLE "EduSkillGuide"       ALTER COLUMN "recommendedTypes"  DROP DEFAULT;

-- ── 2. Remover DEFAULT NOW() de colunas @updatedAt (Prisma gerencia) ────────
-- A migration 0008 adicionou DEFAULT CURRENT_TIMESTAMP para permitir a adição
-- da coluna em bancos existentes. Agora que a coluna existe, o DEFAULT deve ser
-- removido para o Prisma poder gerenciar o valor (ele define no UPDATE, não o banco).
ALTER TABLE "EduSkillGuide"         ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "EduSkillPrerequisite"  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ── 3. Índice único em EduSkillPrerequisite ──────────────────────────────────
-- Declarado no schema como @@unique([skillId, prerequisiteSkillId, networkId])
-- mas ausente no banco.
CREATE UNIQUE INDEX IF NOT EXISTS
  "EduSkillPrerequisite_skillId_prerequisiteSkillId_networkId_key"
  ON "EduSkillPrerequisite" ("skillId", "prerequisiteSkillId", "networkId");

-- ── 4. Corrigir FK em EduActivity.classSubjectId ─────────────────────────────
-- Migration 0001 criou com ON DELETE RESTRICT.
-- Prisma 5 gera ON DELETE SET NULL para relações opcionais.
ALTER TABLE "EduActivity"
  DROP CONSTRAINT IF EXISTS "EduActivity_classSubjectId_fkey";

ALTER TABLE "EduActivity"
  ADD CONSTRAINT "EduActivity_classSubjectId_fkey"
  FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
