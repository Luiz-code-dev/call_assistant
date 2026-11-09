-- Migration: 0011_diagnostic_item_activity_relation
-- Adiciona FK explícita de EduDiagnosticItem → EduActivity
-- A coluna activityId já existe; esta migration só cria a FK.
ALTER TABLE "EduDiagnosticItem"
  ADD CONSTRAINT "EduDiagnosticItem_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "EduDiagnosticItem_activityId_idx" ON "EduDiagnosticItem"("activityId");
