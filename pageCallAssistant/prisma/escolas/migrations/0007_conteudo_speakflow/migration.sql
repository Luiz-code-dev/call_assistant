-- Migration 0007: tornar subjectId opcional em EduTrack e EduDiagnostic
-- e adicionar subjectCode para conteúdo SpeakFlow global

-- EduTrack
ALTER TABLE "EduTrack" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "EduTrack" ALTER COLUMN "gradeYear" DROP NOT NULL;
ALTER TABLE "EduTrack" ADD COLUMN IF NOT EXISTS "subjectCode" TEXT;

-- EduDiagnostic
ALTER TABLE "EduDiagnostic" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "EduDiagnostic" ALTER COLUMN "gradeYear" DROP NOT NULL;
ALTER TABLE "EduDiagnostic" ADD COLUMN IF NOT EXISTS "subjectCode" TEXT;
