-- Migration 0008: colunas que faltam no banco mas estão no schema
-- Só adições, idempotente, segura para rodar contra banco de produção existente

ALTER TABLE "EduActivity"         ADD COLUMN IF NOT EXISTS "estMinutes" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "EduSkillPrerequisite" ADD COLUMN IF NOT EXISTS "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "EduSkillGuide"        ADD COLUMN IF NOT EXISTS "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
