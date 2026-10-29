-- RLS: Row Level Security por rede (networkId)
-- Executar como superusuário; aplicação usa usuário sem BYPASSRLS

-- EduNetwork: a própria rede se isola pelo "id"
ALTER TABLE "EduNetwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduNetwork" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduNetwork" USING ("id" = current_setting('app.network_id', true)) WITH CHECK ("id" = current_setting('app.network_id', true));

ALTER TABLE "EduUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduUser" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduUser" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduMembership" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduMembership" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduSchool" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSchool" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSchool" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduFamilyTip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduFamilyTip" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduFamilyTip" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduSchoolYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSchoolYear" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSchoolYear" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSubject" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSubject" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduCurriculumItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduCurriculumItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduCurriculumItem" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduClass" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduClass" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduClassSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduClassSubject" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduClassSubject" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduStudent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduStudent" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduStudent" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduEnrollment" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduEnrollment" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTeachingPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTeachingPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTeachingPlan" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTopic" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTopic" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduAssessment" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduAssessment" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduGradeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGradeEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGradeEntry" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduGradeCorrection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGradeCorrection" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGradeCorrection" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTermClosure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTermClosure" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTermClosure" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- AuditLog e Invite: networkId nullable — policy permissiva para NULL
ALTER TABLE "EduAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduAuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduAuditLog" USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduImportBatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduImportBatch" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduInvite" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduInvite" USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduActivity" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduActivity" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduFeedbackReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduFeedbackReport" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduFeedbackReport" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSubmission" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSubmission" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduClassSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduClassSession" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduClassSession" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduDiagnostic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduDiagnostic" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduDiagnostic" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduSkillMastery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSkillMastery" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSkillMastery" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduSkillMasteryEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSkillMasteryEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSkillMasteryEvent" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTrack" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTrack" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTrackAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTrackAssignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTrackAssignment" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTrackProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTrackProgress" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTrackProgress" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduTeacherAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduTeacherAlert" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduTeacherAlert" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduGuardian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGuardian" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGuardian" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduGuardianLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGuardianLink" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGuardianLink" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduFamilyCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduFamilyCode" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduFamilyCode" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

ALTER TABLE "EduGuardianInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduGuardianInvite" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduGuardianInvite" USING ("networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" = current_setting('app.network_id', true));

-- EduSkill: BNCC global (networkId NULL) ou da rede
ALTER TABLE "EduSkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EduSkill" FORCE ROW LEVEL SECURITY;
CREATE POLICY rede ON "EduSkill" USING ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true)) WITH CHECK ("networkId" IS NULL OR "networkId" = current_setting('app.network_id', true));

-- Tabelas sem networkId: EduPlatformAdmin, EduAccountState, EduTerm, EduPlanUnit,
-- EduQuizQuestion, EduActivitySkill, EduSessionPresence, EduDiagnosticItem,
-- EduTrackItem, EduGuardianConsent — sem política RLS (acesso via relação).
