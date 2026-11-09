-- Migration: 0012_classsubject_relations
-- Adiciona FK EduClassSubject → EduSubject (a coluna subjectId já existe).
-- A FK EduDiagnosticItem → EduActivity foi adicionada em 0011.
ALTER TABLE "EduClassSubject"
  ADD CONSTRAINT "EduClassSubject_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "EduSubject"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "EduClassSubject_subjectId_idx" ON "EduClassSubject"("subjectId");
