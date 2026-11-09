-- Adiciona coluna isDemo em EduNetwork para identificar redes de demonstracao
ALTER TABLE "EduNetwork" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
