import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS "EduNetwork" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"city" TEXT NOT NULL,"state" CHAR(2) NOT NULL,"ibgeCode" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,"gradeConfig" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EduNetwork_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduNetwork_ibgeCode_key" ON "EduNetwork"("ibgeCode")`,
  `CREATE TABLE IF NOT EXISTS "EduSchool" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"name" TEXT NOT NULL,"inepCode" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,CONSTRAINT "EduSchool_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduSchool_networkId_inepCode_key" ON "EduSchool"("networkId","inepCode")`,
  `ALTER TABLE "EduSchool" ADD CONSTRAINT "EduSchool_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduMembership" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"userId" TEXT NOT NULL,"schoolId" TEXT,"role" "EduRole" NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EduMembership_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduMembership_networkId_userId_schoolId_role_key" ON "EduMembership"("networkId","userId","schoolId","role")`,
  `CREATE INDEX IF NOT EXISTS "EduMembership_userId_idx" ON "EduMembership"("userId")`,
  `ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "EduSchool"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduSchoolYear" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"year" INTEGER NOT NULL,"startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,"isCurrent" BOOLEAN NOT NULL DEFAULT false,CONSTRAINT "EduSchoolYear_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduSchoolYear_networkId_year_key" ON "EduSchoolYear"("networkId","year")`,
  `ALTER TABLE "EduSchoolYear" ADD CONSTRAINT "EduSchoolYear_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduTerm" ("id" TEXT NOT NULL,"schoolYearId" TEXT NOT NULL,"name" TEXT NOT NULL,"order" INTEGER NOT NULL,"startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,"status" "EduTermStatus" NOT NULL DEFAULT 'OPEN',CONSTRAINT "EduTerm_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduTerm_schoolYearId_order_key" ON "EduTerm"("schoolYearId","order")`,
  `ALTER TABLE "EduTerm" ADD CONSTRAINT "EduTerm_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "EduSchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduSubject" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"name" TEXT NOT NULL,"area" TEXT,"color" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,CONSTRAINT "EduSubject_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduSubject_networkId_name_key" ON "EduSubject"("networkId","name")`,
  `ALTER TABLE "EduSubject" ADD CONSTRAINT "EduSubject_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduCurriculumItem" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"subjectId" TEXT NOT NULL,"stage" "EduStage" NOT NULL,"gradeYear" INTEGER NOT NULL,"shift" "EduShift","weeklyHours" INTEGER NOT NULL,CONSTRAINT "EduCurriculumItem_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduCurriculumItem_networkId_subjectId_stage_gradeYear_shift_key" ON "EduCurriculumItem"("networkId","subjectId","stage","gradeYear","shift")`,
  `ALTER TABLE "EduCurriculumItem" ADD CONSTRAINT "EduCurriculumItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EduSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduClass" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"schoolId" TEXT NOT NULL,"schoolYearId" TEXT NOT NULL,"name" TEXT NOT NULL,"stage" "EduStage" NOT NULL,"gradeYear" INTEGER NOT NULL,"shift" "EduShift" NOT NULL,"accessCode" TEXT NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT true,CONSTRAINT "EduClass_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduClass_accessCode_key" ON "EduClass"("accessCode")`,
  `CREATE INDEX IF NOT EXISTS "EduClass_networkId_schoolId_schoolYearId_idx" ON "EduClass"("networkId","schoolId","schoolYearId")`,
  `ALTER TABLE "EduClass" ADD CONSTRAINT "EduClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "EduSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "EduClass" ADD CONSTRAINT "EduClass_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "EduSchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduClassSubject" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"classId" TEXT NOT NULL,"subjectId" TEXT NOT NULL,"teacherId" TEXT,"isExtra" BOOLEAN NOT NULL DEFAULT false,CONSTRAINT "EduClassSubject_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduClassSubject_classId_subjectId_key" ON "EduClassSubject"("classId","subjectId")`,
  `CREATE INDEX IF NOT EXISTS "EduClassSubject_teacherId_idx" ON "EduClassSubject"("teacherId")`,
  `ALTER TABLE "EduClassSubject" ADD CONSTRAINT "EduClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduStudent" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"enrollmentCode" TEXT NOT NULL,"fullName" TEXT NOT NULL,"birthDate" TIMESTAMP(3),"pinHash" TEXT NOT NULL,"pinFailedCount" INTEGER NOT NULL DEFAULT 0,"pinLockedUntil" TIMESTAMP(3),"guardianConsentAt" TIMESTAMP(3),"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EduStudent_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduStudent_networkId_enrollmentCode_key" ON "EduStudent"("networkId","enrollmentCode")`,
  `ALTER TABLE "EduStudent" ADD CONSTRAINT "EduStudent_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduEnrollment" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"classId" TEXT NOT NULL,"schoolYearId" TEXT NOT NULL,"status" "EduEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',"startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"endedAt" TIMESTAMP(3),CONSTRAINT "EduEnrollment_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "EduEnrollment_studentId_schoolYearId_idx" ON "EduEnrollment"("studentId","schoolYearId")`,
  `CREATE INDEX IF NOT EXISTS "EduEnrollment_classId_idx" ON "EduEnrollment"("classId")`,
  `ALTER TABLE "EduEnrollment" ADD CONSTRAINT "EduEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "EduStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "EduEnrollment" ADD CONSTRAINT "EduEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduTeachingPlan" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"schoolId" TEXT,"subjectId" TEXT NOT NULL,"stage" "EduStage" NOT NULL,"gradeYear" INTEGER NOT NULL,"schoolYearId" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"status" "EduPlanStatus" NOT NULL DEFAULT 'DRAFT',"title" TEXT NOT NULL,"objectives" TEXT NOT NULL,"createdById" TEXT NOT NULL,"approvedById" TEXT,"approvedAt" TIMESTAMP(3),CONSTRAINT "EduTeachingPlan_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduTeachingPlan_networkId_schoolId_subjectId_stage_gradeYear_schoolYearId_version_key" ON "EduTeachingPlan"("networkId","schoolId","subjectId","stage","gradeYear","schoolYearId","version")`,
  `CREATE TABLE IF NOT EXISTS "EduPlanUnit" ("id" TEXT NOT NULL,"planId" TEXT NOT NULL,"termOrder" INTEGER,"order" INTEGER NOT NULL,"title" TEXT NOT NULL,"objectives" TEXT NOT NULL,"bnccSkills" TEXT[] NOT NULL DEFAULT '{}',CONSTRAINT "EduPlanUnit_pkey" PRIMARY KEY ("id"))`,
  `ALTER TABLE "EduPlanUnit" ADD CONSTRAINT "EduPlanUnit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EduTeachingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduTopic" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"classSubjectId" TEXT NOT NULL,"unitId" TEXT NOT NULL,"title" TEXT NOT NULL,"description" TEXT,"plannedDate" TIMESTAMP(3),"taughtAt" TIMESTAMP(3),"createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EduTopic_pkey" PRIMARY KEY ("id"))`,
  `ALTER TABLE "EduTopic" ADD CONSTRAINT "EduTopic_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "EduTopic" ADD CONSTRAINT "EduTopic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "EduPlanUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduAssessment" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"classSubjectId" TEXT NOT NULL,"termId" TEXT NOT NULL,"title" TEXT NOT NULL,"type" "EduAssessmentType" NOT NULL,"weight" DECIMAL(5,2) NOT NULL DEFAULT 1,"maxScore" DECIMAL(5,2) NOT NULL DEFAULT 10,"appliedAt" TIMESTAMP(3),"status" "EduAssessmentStatus" NOT NULL DEFAULT 'DRAFT',"topicIds" TEXT[] NOT NULL DEFAULT '{}',"aiChallengeId" TEXT,"createdById" TEXT NOT NULL,"publishedAt" TIMESTAMP(3),CONSTRAINT "EduAssessment_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "EduAssessment_classSubjectId_termId_idx" ON "EduAssessment"("classSubjectId","termId")`,
  `ALTER TABLE "EduAssessment" ADD CONSTRAINT "EduAssessment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `ALTER TABLE "EduAssessment" ADD CONSTRAINT "EduAssessment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "EduTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduGradeEntry" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"assessmentId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"value" DECIMAL(5,2),"absent" BOOLEAN NOT NULL DEFAULT false,"version" INTEGER NOT NULL,"correctionId" TEXT,"enteredById" TEXT NOT NULL,"enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"prevHash" TEXT NOT NULL,"hash" TEXT NOT NULL,"signature" TEXT NOT NULL,"keyId" TEXT NOT NULL,CONSTRAINT "EduGradeEntry_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduGradeEntry_hash_key" ON "EduGradeEntry"("hash")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduGradeEntry_assessmentId_studentId_version_key" ON "EduGradeEntry"("assessmentId","studentId","version")`,
  `CREATE INDEX IF NOT EXISTS "EduGradeEntry_assessmentId_studentId_idx" ON "EduGradeEntry"("assessmentId","studentId")`,
  `ALTER TABLE "EduGradeEntry" ADD CONSTRAINT "EduGradeEntry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "EduAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduGradeCorrection" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"assessmentId" TEXT NOT NULL,"studentId" TEXT NOT NULL,"fromEntryId" TEXT NOT NULL,"newValue" DECIMAL(5,2),"newAbsent" BOOLEAN NOT NULL DEFAULT false,"justification" TEXT NOT NULL,"requestedById" TEXT NOT NULL,"requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"status" "EduCorrectionStatus" NOT NULL DEFAULT 'PENDING',"decidedById" TEXT,"decidedAt" TIMESTAMP(3),"decisionNote" TEXT,CONSTRAINT "EduGradeCorrection_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "EduTermClosure" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"classSubjectId" TEXT NOT NULL,"termId" TEXT NOT NULL,"version" INTEGER NOT NULL,"closedById" TEXT NOT NULL,"closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"averages" JSONB NOT NULL,"rootHash" TEXT NOT NULL,"signature" TEXT NOT NULL,"keyId" TEXT NOT NULL,"verificationCode" TEXT NOT NULL,CONSTRAINT "EduTermClosure_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduTermClosure_verificationCode_key" ON "EduTermClosure"("verificationCode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EduTermClosure_classSubjectId_termId_version_key" ON "EduTermClosure"("classSubjectId","termId","version")`,
  `ALTER TABLE "EduTermClosure" ADD CONSTRAINT "EduTermClosure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "EduTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduAuditLog" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"actorType" TEXT NOT NULL,"actorId" TEXT NOT NULL,"action" TEXT NOT NULL,"entity" TEXT NOT NULL,"entityId" TEXT NOT NULL,"metadata" JSONB,"ip" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EduAuditLog_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "EduAuditLog_networkId_entity_entityId_idx" ON "EduAuditLog"("networkId","entity","entityId")`,
  `CREATE INDEX IF NOT EXISTS "EduAuditLog_networkId_createdAt_idx" ON "EduAuditLog"("networkId","createdAt")`,
  `CREATE OR REPLACE FUNCTION edu_block_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Registro imutável (%): alteração e exclusão não são permitidas', TG_TABLE_NAME; END; $$ LANGUAGE plpgsql`,
  `CREATE OR REPLACE TRIGGER edu_grade_entry_immutable BEFORE UPDATE OR DELETE ON "EduGradeEntry" FOR EACH ROW EXECUTE FUNCTION edu_block_mutation()`,
  `CREATE OR REPLACE TRIGGER edu_term_closure_immutable BEFORE UPDATE OR DELETE ON "EduTermClosure" FOR EACH ROW EXECUTE FUNCTION edu_block_mutation()`,
  `CREATE OR REPLACE TRIGGER edu_audit_log_immutable BEFORE UPDATE OR DELETE ON "EduAuditLog" FOR EACH ROW EXECUTE FUNCTION edu_block_mutation()`,
  // === Migration 00002 ===
  `DO $$ BEGIN CREATE TYPE "EduImportKind" AS ENUM ('SCHOOLS','STAFF','STUDENTS','ASSIGNMENTS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "EduImportStatus" AS ENUM ('UPLOADED','PREVIEW','PROCESSING','DONE','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "EduStudentLoginMode" AS ENUM ('PIN','PICTURE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "loginMode" TEXT NOT NULL DEFAULT 'PIN'`,
  `ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "pictureSecretHash" TEXT`,
  `ALTER TABLE "EduStudent" ADD COLUMN IF NOT EXISTS "cardVersion" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "EduClass" ADD COLUMN IF NOT EXISTS "defaultLoginMode" TEXT NOT NULL DEFAULT 'PIN'`,
  `ALTER TABLE "EduAssessment" ALTER COLUMN "termId" DROP NOT NULL`,
  `ALTER TABLE "EduGradeEntry" ADD COLUMN IF NOT EXISTS "note" TEXT`,
  `CREATE TABLE IF NOT EXISTS "EduImportBatch" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"schoolId" TEXT,"kind" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'UPLOADED',"fileName" TEXT NOT NULL,"columnMap" JSONB,"totalRows" INTEGER NOT NULL DEFAULT 0,"processed" INTEGER NOT NULL DEFAULT 0,"created" INTEGER NOT NULL DEFAULT 0,"updated" INTEGER NOT NULL DEFAULT 0,"failed" INTEGER NOT NULL DEFAULT 0,"errors" JSONB,"createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"finishedAt" TIMESTAMP(3),CONSTRAINT "EduImportBatch_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "EduImportBatch_networkId_createdAt_idx" ON "EduImportBatch"("networkId","createdAt")`,
  `ALTER TABLE "EduImportBatch" ADD CONSTRAINT "EduImportBatch_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduInvite" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"schoolId" TEXT,"email" TEXT NOT NULL,"name" TEXT NOT NULL,"role" TEXT NOT NULL,"tokenHash" TEXT NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"acceptedAt" TIMESTAMP(3),"userId" TEXT,"sentCount" INTEGER NOT NULL DEFAULT 1,"createdById" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "EduInvite_pkey" PRIMARY KEY ("id"),CONSTRAINT "EduInvite_tokenHash_key" UNIQUE ("tokenHash"))`,
  `CREATE INDEX IF NOT EXISTS "EduInvite_networkId_email_idx" ON "EduInvite"("networkId","email")`,
  `ALTER TABLE "EduInvite" ADD CONSTRAINT "EduInvite_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  `CREATE TABLE IF NOT EXISTS "EduClassSession" ("id" TEXT NOT NULL,"networkId" TEXT NOT NULL,"classId" TEXT NOT NULL,"openedById" TEXT NOT NULL,"code" TEXT NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"closedAt" TIMESTAMP(3),CONSTRAINT "EduClassSession_pkey" PRIMARY KEY ("id"),CONSTRAINT "EduClassSession_code_key" UNIQUE ("code"))`,
  `CREATE INDEX IF NOT EXISTS "EduClassSession_code_idx" ON "EduClassSession"("code")`,
  `ALTER TABLE "EduClassSession" ADD CONSTRAINT "EduClassSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
];

let ok = 0;
let skip = 0;

for (const sql of statements) {
  try {
    await db.$executeRawUnsafe(sql);
    ok++;
  } catch (e) {
    const msg = e.message ?? "";
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      skip++;
    } else {
      console.error("ERRO:", msg.slice(0, 120));
    }
  }
}

console.log(`\n✓ ${ok} executados, ${skip} já existiam.`);
await db.$disconnect();
