-- Permitir múltiplas tentativas por usuário por desafio
-- Remove restrição única userId+challengeId e adiciona isSelected
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_userId_challengeId_key";
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "isSelected" BOOLEAN NOT NULL DEFAULT true;
