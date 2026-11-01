-- Migration 0009: ajustes de esquema — alinha banco com schema.prisma
-- Todas as operações são idempotentes ou seguras de repetir.

-- ── 1. Garantir defaults de array alinhados com @default([]) do schema ──────
-- Prisma 5 gera DEFAULT '{}' para Int[] @default([]) e TEXT[] @default([]).
-- Algumas versões anteriores criaram DEFAULT ARRAY[]::...; normalizamos para
-- o valor canônico que o Prisma espera (sem perder o default).
-- Usamos ALTER ... SET DEFAULT para ser idempotente.
ALTER TABLE "EduActivity"   ALTER COLUMN "gradeYears"       SET DEFAULT '{}';
ALTER TABLE "EduActivity"   ALTER COLUMN "skillIds"         SET DEFAULT '{}';
ALTER TABLE "EduLesson"     ALTER COLUMN "skillIds"         SET DEFAULT '{}';
ALTER TABLE "EduSkillGuide" ALTER COLUMN "recommendedTypes" SET DEFAULT '{}';
ALTER TABLE "EduTrack"      ALTER COLUMN "skillIds"         SET DEFAULT '{}';

-- ── 2. Remover DEFAULT NOW() de colunas @updatedAt (Prisma gerencia) ────────
-- A migration 0008 adicionou DEFAULT CURRENT_TIMESTAMP para permitir a adição
-- da coluna em bancos existentes. Agora que a coluna existe, o DEFAULT deve ser
-- removido para o Prisma poder gerenciar o valor (ele define no UPDATE, não o banco).
ALTER TABLE "EduSkillGuide"         ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "EduSkillPrerequisite"  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ── 3. Constraint única em EduSkillPrerequisite ──────────────────────────────
-- Declarado no schema como @@unique([skillId, prerequisiteSkillId, networkId]).
-- Prisma 5 gera UNIQUE CONSTRAINT (não CREATE INDEX), portanto usamos ADD CONSTRAINT.
-- O DROP ... IF EXISTS garante idempotência.
ALTER TABLE "EduSkillPrerequisite"
  DROP CONSTRAINT IF EXISTS
    "EduSkillPrerequisite_skillId_prerequisiteSkillId_networkId_key";

ALTER TABLE "EduSkillPrerequisite"
  ADD CONSTRAINT "EduSkillPrerequisite_skillId_prerequisiteSkillId_networkId_key"
  UNIQUE ("skillId", "prerequisiteSkillId", "networkId");

-- ── 4. Corrigir FK em EduActivity.classSubjectId ─────────────────────────────
-- Migration 0001 criou com ON DELETE RESTRICT.
-- Prisma 5 gera ON DELETE SET NULL para relações opcionais.
ALTER TABLE "EduActivity"
  DROP CONSTRAINT IF EXISTS "EduActivity_classSubjectId_fkey";

ALTER TABLE "EduActivity"
  ADD CONSTRAINT "EduActivity_classSubjectId_fkey"
  FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
