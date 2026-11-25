-- Migration 0026: o professor escolhe o assunto do aviso à família (reforço, elogio, tarefa, frequência, recado).
-- Só acrescenta: uma coluna com valor padrão. Os avisos já enviados ficam como "REFORCO".
ALTER TABLE "EduReforcoIndicado" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'REFORCO';
