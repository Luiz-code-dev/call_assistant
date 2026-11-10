-- Migration 0017: código do aluno para entrar no reforço
-- Só acrescenta: uma coluna nova (opcional) e um índice único.
-- O código é gerado pela plataforma e entregue à escola na lista de alunos.

ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "accessCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "EduStudent_accessCode_key" ON "EduStudent"("accessCode");
