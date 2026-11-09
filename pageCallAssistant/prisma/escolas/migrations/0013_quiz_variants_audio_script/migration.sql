-- Migration 0013: adiciona variants em EduQuizQuestion e audioScript em EduActivity
-- Ambos são opcionais e aditivos — não quebra dados existentes.

ALTER TABLE "EduQuizQuestion" ADD COLUMN IF NOT EXISTS "variants" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "EduActivity" ADD COLUMN IF NOT EXISTS "audioScript" TEXT;
