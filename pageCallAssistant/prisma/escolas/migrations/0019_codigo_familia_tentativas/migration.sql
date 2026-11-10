-- Migration 0019: limite de tentativas no código de família (data de nascimento errada)
-- Só acrescenta duas colunas.
ALTER TABLE "EduFamilyCode" ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EduFamilyCode" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMPTZ;
