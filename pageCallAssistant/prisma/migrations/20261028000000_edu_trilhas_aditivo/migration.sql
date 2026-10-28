-- Additive migration: trilhas de reforço completas
-- Nenhuma coluna ou tabela existente é alterada ou removida.

-- EduNetwork: flag de aprovação obrigatória
ALTER TABLE "EduNetwork" ADD COLUMN IF NOT EXISTS "requireTrackApproval" BOOLEAN NOT NULL DEFAULT true;

-- EduTrack: notas de revisão e timestamp de envio para aprovação
ALTER TABLE "EduTrack" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
ALTER TABLE "EduTrack" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMPTZ;

-- EduTrackAssignment: encerramento manual e atribuição forçada
ALTER TABLE "EduTrackAssignment" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMPTZ;
ALTER TABLE "EduTrackAssignment" ADD COLUMN IF NOT EXISTS "forced" BOOLEAN NOT NULL DEFAULT false;

-- EduTrackProgress: timestamp de conclusão
ALTER TABLE "EduTrackProgress" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;

-- EduTeacherAlert: avisos ao professor
CREATE TABLE IF NOT EXISTS "EduTeacherAlert" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "networkId"      TEXT NOT NULL,
  "teacherUserId"  TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "studentId"      TEXT,
  "trackId"        TEXT,
  "skillId"        TEXT,
  "readAt"         TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "EduTeacherAlert_teacherUserId_readAt_idx" ON "EduTeacherAlert"("teacherUserId", "readAt");
CREATE INDEX IF NOT EXISTS "EduTeacherAlert_networkId_createdAt_idx"  ON "EduTeacherAlert"("networkId", "createdAt");
