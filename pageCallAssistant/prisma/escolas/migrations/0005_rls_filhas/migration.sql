-- 0005_rls_filhas: RLS nas tabelas filhas sem networkId direto + reviewNote
-- Apenas adições: CREATE POLICY, ADD COLUMN IF NOT EXISTS. Sem DROP TABLE/COLUMN/ENUM.

-- ── 1. reviewNote nas tabelas que o Estúdio usa (fichas e pré-requisitos) ──

ALTER TABLE "EduSkillGuide"        ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
ALTER TABLE "EduSkillPrerequisite" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;

-- ── 2. RLS em EduQuizQuestion (filha de EduActivity) ──

ALTER TABLE "EduQuizQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduQuizQuestion" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rede ON "EduQuizQuestion";
DROP POLICY IF EXISTS rede_leitura ON "EduQuizQuestion";
DROP POLICY IF EXISTS rede_escrita ON "EduQuizQuestion";

-- Leitura: aceita questões de atividades globais (networkId IS NULL) ou da rede
CREATE POLICY rede_leitura ON "EduQuizQuestion"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "EduActivity" a
      WHERE a."id" = "activityId"
        AND (a."networkId" IS NULL OR a."networkId" = current_setting('app.network_id', true))
    )
  );

-- Escrita: só atividades da própria rede
CREATE POLICY rede_escrita ON "EduQuizQuestion"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "EduActivity" a
      WHERE a."id" = "activityId"
        AND a."networkId" = current_setting('app.network_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "EduActivity" a
      WHERE a."id" = "activityId"
        AND a."networkId" = current_setting('app.network_id', true)
    )
  );

-- ── 3. RLS em EduTrackItem (filha de EduTrack) ──

ALTER TABLE "EduTrackItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTrackItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rede ON "EduTrackItem";
DROP POLICY IF EXISTS rede_leitura ON "EduTrackItem";
DROP POLICY IF EXISTS rede_escrita ON "EduTrackItem";

CREATE POLICY rede_leitura ON "EduTrackItem"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "EduTrack" t
      WHERE t."id" = "trackId"
        AND (t."networkId" IS NULL OR t."networkId" = current_setting('app.network_id', true))
    )
  );

CREATE POLICY rede_escrita ON "EduTrackItem"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "EduTrack" t
      WHERE t."id" = "trackId"
        AND t."networkId" = current_setting('app.network_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "EduTrack" t
      WHERE t."id" = "trackId"
        AND t."networkId" = current_setting('app.network_id', true)
    )
  );

-- ── 4. RLS em EduDiagnosticItem (filha de EduDiagnostic) ──

ALTER TABLE "EduDiagnosticItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduDiagnosticItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rede ON "EduDiagnosticItem";
DROP POLICY IF EXISTS rede_leitura ON "EduDiagnosticItem";
DROP POLICY IF EXISTS rede_escrita ON "EduDiagnosticItem";

CREATE POLICY rede_leitura ON "EduDiagnosticItem"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "EduDiagnostic" d
      WHERE d."id" = "diagnosticId"
        AND (d."networkId" IS NULL OR d."networkId" = current_setting('app.network_id', true))
    )
  );

CREATE POLICY rede_escrita ON "EduDiagnosticItem"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "EduDiagnostic" d
      WHERE d."id" = "diagnosticId"
        AND d."networkId" = current_setting('app.network_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "EduDiagnostic" d
      WHERE d."id" = "diagnosticId"
        AND d."networkId" = current_setting('app.network_id', true)
    )
  );

-- ── 5. RLS em EduActivitySkill (junction table sem networkId) ──

ALTER TABLE "EduActivitySkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduActivitySkill" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rede ON "EduActivitySkill";
DROP POLICY IF EXISTS rede_leitura ON "EduActivitySkill";
DROP POLICY IF EXISTS rede_escrita ON "EduActivitySkill";

CREATE POLICY rede_leitura ON "EduActivitySkill"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "EduActivity" a
      WHERE a."id" = "activityId"
        AND (a."networkId" IS NULL OR a."networkId" = current_setting('app.network_id', true))
    )
  );

CREATE POLICY rede_escrita ON "EduActivitySkill"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "EduActivity" a
      WHERE a."id" = "activityId"
        AND a."networkId" = current_setting('app.network_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "EduActivity" a
      WHERE a."id" = "activityId"
        AND a."networkId" = current_setting('app.network_id', true)
    )
  );
