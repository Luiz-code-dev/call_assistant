-- Area da familia (painel): contato da escola + dica semanal gerada pela IA.
-- Migracao puramente aditiva (nao remove/renomeia nada).

ALTER TABLE "EduSchool" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "EduSchool" ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE TABLE IF NOT EXISTS "EduFamilyTip" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduFamilyTip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EduFamilyTip_studentId_weekStart_key" ON "EduFamilyTip"("studentId", "weekStart");
CREATE INDEX IF NOT EXISTS "EduFamilyTip_networkId_idx" ON "EduFamilyTip"("networkId");
