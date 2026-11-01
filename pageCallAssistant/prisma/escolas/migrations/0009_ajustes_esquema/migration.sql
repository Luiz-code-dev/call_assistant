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
-- Prisma 5 gera UNIQUE CONSTRAINT (não CREATE INDEX).
-- Migrações anteriores podem ter criado um INDEX standalone com o mesmo nome,
-- o que faz ADD CONSTRAINT falhar com "relation already exists" (42P07).
-- O bloco PL/pgSQL abaixo trata os dois casos de forma idempotente:
--  a) Se já existe como CONSTRAINT → não faz nada.
--  b) Se existe como INDEX standalone → dropa e cria como CONSTRAINT.
--  c) Se não existe → cria diretamente.
DO $$
DECLARE
  v_conname TEXT := 'EduSkillPrerequisite_skillId_prerequisiteSkillId_networkId_key';
BEGIN
  -- Caso (a): já existe como CONSTRAINT UNIQUE
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'EduSkillPrerequisite'
      AND c.conname = v_conname
      AND c.contype = 'u'
  ) THEN
    RETURN; -- já está correto, nada a fazer
  END IF;

  -- Caso (b): existe como INDEX standalone (sem constraint associada)
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'EduSkillPrerequisite' AND indexname = v_conname
  ) THEN
    EXECUTE format('DROP INDEX %I', v_conname);
  END IF;

  -- Caso (b) e (c): cria como CONSTRAINT
  ALTER TABLE "EduSkillPrerequisite"
    ADD CONSTRAINT "EduSkillPrerequisite_skillId_prerequisiteSkillId_networkId_key"
    UNIQUE ("skillId", "prerequisiteSkillId", "networkId");
END $$;

-- ── 4. Corrigir FK em EduActivity.classSubjectId ─────────────────────────────
-- Migration 0001 criou com ON DELETE RESTRICT.
-- Prisma 5 gera ON DELETE SET NULL para relações opcionais.
ALTER TABLE "EduActivity"
  DROP CONSTRAINT IF EXISTS "EduActivity_classSubjectId_fkey";

ALTER TABLE "EduActivity"
  ADD CONSTRAINT "EduActivity_classSubjectId_fkey"
  FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
