-- Migration 0024: o aluno pode trazer uma redação da escola para o Flow ler.
-- Só acrescenta: uma coluna opcional e um índice.
ALTER TABLE "EduEssayPrompt" ADD COLUMN IF NOT EXISTS "ownerStudentId" TEXT;
CREATE INDEX IF NOT EXISTS "EduEssayPrompt_ownerStudentId_idx" ON "EduEssayPrompt"("ownerStudentId");
