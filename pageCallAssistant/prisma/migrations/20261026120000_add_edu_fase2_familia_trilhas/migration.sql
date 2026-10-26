-- Cria tabelas das Fases 2 (habilidades/diagnostico), 5 (familia) e trilhas
-- que existiam no schema.prisma mas nunca tiveram migration (drift).
-- Migration puramente aditiva: nenhum DROP/ALTER em objeto existente.

CREATE TYPE "EduMasteryLevel" AS ENUM ('NOT_YET', 'ALMOST', 'MASTERED');
CREATE TYPE "EduGuardianRelation" AS ENUM ('MAE', 'PAI', 'AVO_AVO', 'TIO_TIA', 'TUTOR_LEGAL', 'OUTRO');

CREATE TABLE "EduSkill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "gradeYears" INTEGER[],
    "description" TEXT NOT NULL,
    "shortLabel" TEXT,
    "networkId" TEXT,

    CONSTRAINT "EduSkill_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduActivitySkill" (
    "activityId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "EduActivitySkill_pkey" PRIMARY KEY ("activityId","skillId")
);
CREATE TABLE "EduDiagnostic" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduDiagnostic_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduDiagnosticItem" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "activityId" TEXT NOT NULL,

    CONSTRAINT "EduDiagnosticItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduSkillMastery" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "EduMasteryLevel" NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EduSkillMastery_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduSkillMasteryEvent" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "EduMasteryLevel" NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduSkillMasteryEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduTrack" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "skillIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduTrack_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduTrackItem" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "activityId" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "EduTrackItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduTrackAssignment" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "classId" TEXT,
    "studentId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),

    CONSTRAINT "EduTrackAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduTrackProgress" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "completedItemIds" TEXT[],
    "lastActivityAt" TIMESTAMP(3),

    CONSTRAINT "EduTrackProgress_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduGuardian" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduGuardian_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduGuardianLink" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relation" "EduGuardianRelation" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,

    CONSTRAINT "EduGuardianLink_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduFamilyCode" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "activationsLeft" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduFamilyCode_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduGuardianInvite" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,

    CONSTRAINT "EduGuardianInvite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EduGuardianConsent" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "EduGuardianConsent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "_TrackSkills" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "EduSkill_code_key" ON "EduSkill"("code");
CREATE INDEX "EduSkill_subjectCode_stage_idx" ON "EduSkill"("subjectCode", "stage");
CREATE INDEX "EduSkill_networkId_idx" ON "EduSkill"("networkId");
CREATE INDEX "EduActivitySkill_skillId_idx" ON "EduActivitySkill"("skillId");
CREATE INDEX "EduDiagnostic_networkId_subjectId_gradeYear_idx" ON "EduDiagnostic"("networkId", "subjectId", "gradeYear");
CREATE INDEX "EduDiagnostic_networkId_status_idx" ON "EduDiagnostic"("networkId", "status");
CREATE INDEX "EduDiagnosticItem_diagnosticId_idx" ON "EduDiagnosticItem"("diagnosticId");
CREATE INDEX "EduDiagnosticItem_skillId_idx" ON "EduDiagnosticItem"("skillId");
CREATE INDEX "EduSkillMastery_networkId_skillId_level_idx" ON "EduSkillMastery"("networkId", "skillId", "level");
CREATE UNIQUE INDEX "EduSkillMastery_studentId_skillId_key" ON "EduSkillMastery"("studentId", "skillId");
CREATE INDEX "EduSkillMasteryEvent_studentId_skillId_idx" ON "EduSkillMasteryEvent"("studentId", "skillId");
CREATE INDEX "EduSkillMasteryEvent_networkId_createdAt_idx" ON "EduSkillMasteryEvent"("networkId", "createdAt");
CREATE INDEX "EduTrack_networkId_subjectId_gradeYear_idx" ON "EduTrack"("networkId", "subjectId", "gradeYear");
CREATE INDEX "EduTrack_networkId_status_idx" ON "EduTrack"("networkId", "status");
CREATE INDEX "EduTrackItem_trackId_idx" ON "EduTrackItem"("trackId");
CREATE INDEX "EduTrackAssignment_networkId_classId_idx" ON "EduTrackAssignment"("networkId", "classId");
CREATE INDEX "EduTrackAssignment_networkId_studentId_idx" ON "EduTrackAssignment"("networkId", "studentId");
CREATE INDEX "EduTrackProgress_studentId_idx" ON "EduTrackProgress"("studentId");
CREATE UNIQUE INDEX "EduTrackProgress_assignmentId_studentId_key" ON "EduTrackProgress"("assignmentId", "studentId");
CREATE UNIQUE INDEX "EduGuardian_userId_key" ON "EduGuardian"("userId");
CREATE INDEX "EduGuardian_networkId_email_idx" ON "EduGuardian"("networkId", "email");
CREATE INDEX "EduGuardian_networkId_phone_idx" ON "EduGuardian"("networkId", "phone");
CREATE INDEX "EduGuardianLink_networkId_studentId_idx" ON "EduGuardianLink"("networkId", "studentId");
CREATE INDEX "EduGuardianLink_networkId_isActive_idx" ON "EduGuardianLink"("networkId", "isActive");
CREATE UNIQUE INDEX "EduGuardianLink_guardianId_studentId_key" ON "EduGuardianLink"("guardianId", "studentId");
CREATE UNIQUE INDEX "EduFamilyCode_studentId_key" ON "EduFamilyCode"("studentId");
CREATE INDEX "EduFamilyCode_networkId_idx" ON "EduFamilyCode"("networkId");
CREATE UNIQUE INDEX "EduGuardianInvite_tokenHash_key" ON "EduGuardianInvite"("tokenHash");
CREATE INDEX "EduGuardianInvite_networkId_idx" ON "EduGuardianInvite"("networkId");
CREATE INDEX "EduGuardianConsent_guardianId_studentId_idx" ON "EduGuardianConsent"("guardianId", "studentId");
CREATE UNIQUE INDEX "_TrackSkills_AB_unique" ON "_TrackSkills"("A", "B");
CREATE INDEX "_TrackSkills_B_index" ON "_TrackSkills"("B");

ALTER TABLE "EduActivitySkill" ADD CONSTRAINT "EduActivitySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduDiagnosticItem" ADD CONSTRAINT "EduDiagnosticItem_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "EduDiagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EduDiagnosticItem" ADD CONSTRAINT "EduDiagnosticItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduSkillMastery" ADD CONSTRAINT "EduSkillMastery_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduSkillMasteryEvent" ADD CONSTRAINT "EduSkillMasteryEvent_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduTrackItem" ADD CONSTRAINT "EduTrackItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "EduTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EduTrackAssignment" ADD CONSTRAINT "EduTrackAssignment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "EduTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduTrackProgress" ADD CONSTRAINT "EduTrackProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EduTrackAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduGuardian" ADD CONSTRAINT "EduGuardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EduGuardianLink" ADD CONSTRAINT "EduGuardianLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "EduGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduGuardianInvite" ADD CONSTRAINT "EduGuardianInvite_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "EduGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduGuardianConsent" ADD CONSTRAINT "EduGuardianConsent_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "EduGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_TrackSkills" ADD CONSTRAINT "_TrackSkills_A_fkey" FOREIGN KEY ("A") REFERENCES "EduSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TrackSkills" ADD CONSTRAINT "_TrackSkills_B_fkey" FOREIGN KEY ("B") REFERENCES "EduTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
