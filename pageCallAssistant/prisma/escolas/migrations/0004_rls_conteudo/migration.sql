-- 0004_rls_conteudo: corrige RLS para conteúdo global (networkId IS NULL)
-- e habilita RLS nas tabelas criadas em 0003.
-- Apenas DROP POLICY + CREATE POLICY + ENABLE/FORCE. Sem DROP TABLE, ALTER COLUMN, DROP COLUMN.

-- ── 1. Corrigir políticas em tabelas com networkId nullable (conteúdo SpeakFlow) ──

-- EduActivity
DROP POLICY IF EXISTS rede ON "EduActivity";
CREATE POLICY rede_leitura ON "EduActivity"
  FOR SELECT
  USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));
CREATE POLICY rede_escrita ON "EduActivity"
  FOR ALL
  USING ("networkId" = current_setting('app.network_id', true))
  WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- EduDiagnostic
DROP POLICY IF EXISTS rede ON "EduDiagnostic";
CREATE POLICY rede_leitura ON "EduDiagnostic"
  FOR SELECT
  USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));
CREATE POLICY rede_escrita ON "EduDiagnostic"
  FOR ALL
  USING ("networkId" = current_setting('app.network_id', true))
  WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- EduTrack
DROP POLICY IF EXISTS rede ON "EduTrack";
CREATE POLICY rede_leitura ON "EduTrack"
  FOR SELECT
  USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));
CREATE POLICY rede_escrita ON "EduTrack"
  FOR ALL
  USING ("networkId" = current_setting('app.network_id', true))
  WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- ── 2. EduSkillPrerequisite: nova tabela sem RLS ──────────────────────────────
ALTER TABLE "EduSkillPrerequisite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSkillPrerequisite" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede_leitura ON "EduSkillPrerequisite"
  FOR SELECT
  USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));
CREATE POLICY rede_escrita ON "EduSkillPrerequisite"
  FOR ALL
  USING ("networkId" = current_setting('app.network_id', true))
  WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- ── 3. EduSkillGuide: nova tabela sem RLS ────────────────────────────────────
ALTER TABLE "EduSkillGuide" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSkillGuide" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede_leitura ON "EduSkillGuide"
  FOR SELECT
  USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));
CREATE POLICY rede_escrita ON "EduSkillGuide"
  FOR ALL
  USING ("networkId" = current_setting('app.network_id', true))
  WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- ── 4. EduLesson: nova tabela com networkId NOT NULL ─────────────────────────
ALTER TABLE "EduLesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduLesson" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduLesson"
  USING ("networkId" = current_setting('app.network_id', true))
  WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- ── 5. EduLessonObjective: sem networkId; acesso via pai EduLesson ────────────
-- A policy verifica se o lessonId pai está visível para esta rede.
ALTER TABLE "EduLessonObjective" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduLessonObjective" FORCE ROW LEVEL SECURITY;
CREATE POLICY via_lesson ON "EduLessonObjective"
  USING (EXISTS (
    SELECT 1 FROM "EduLesson" l
    WHERE l."id" = "EduLessonObjective"."lessonId"
      AND l."networkId" = current_setting('app.network_id', true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "EduLesson" l
    WHERE l."id" = "EduLessonObjective"."lessonId"
      AND l."networkId" = current_setting('app.network_id', true)
  ));

-- ── 6. Papel escolas_app (criado dinamicamente em migrate-all.mjs) ───────────
-- A criação e GRANT do papel escolas_app é feita em migrate-all.mjs
-- porque precisa de senha dinâmica (ESCOLAS_APP_DB_PASSWORD).
-- Esta migration só documenta a intenção.
COMMENT ON TABLE "EduLesson" IS 'Aula registrada pelo professor. RLS: networkId = app.network_id.';
