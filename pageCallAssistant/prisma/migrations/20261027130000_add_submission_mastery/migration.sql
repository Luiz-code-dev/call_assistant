-- Nivel alcancado na entrega (habilidade principal) para o retorno da familia.
-- Aditivo: entregas antigas ficam NULL (retorno sem selo de nivel).
ALTER TABLE "EduSubmission" ADD COLUMN IF NOT EXISTS "masteryLevel" "EduMasteryLevel";
ALTER TABLE "EduSubmission" ADD COLUMN IF NOT EXISTS "skillId" TEXT;
