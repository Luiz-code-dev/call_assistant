-- CreateEnum
CREATE TYPE "EduRole" AS ENUM ('NETWORK_ADMIN', 'COORDINATOR', 'SCHOOL_ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "EduInviteRole" AS ENUM ('PLATFORM_ADMIN', 'NETWORK_ADMIN', 'COORDINATOR', 'SCHOOL_ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "EduStage" AS ENUM ('EARLY_CHILDHOOD', 'ELEMENTARY_EARLY', 'ELEMENTARY_LATE', 'HIGH_SCHOOL', 'EJA');

-- CreateEnum
CREATE TYPE "EduShift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'FULL_TIME');

-- CreateEnum
CREATE TYPE "EduTermStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EduEnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'PROMOTED', 'RETAINED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EduPlanStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EduAssessmentType" AS ENUM ('EXAM', 'ASSIGNMENT', 'PROJECT', 'AI_ACTIVITY', 'RECOVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "EduAssessmentStatus" AS ENUM ('DRAFT', 'OPEN', 'GRADING', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "EduCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EduImportKind" AS ENUM ('SCHOOLS', 'STAFF', 'STUDENTS', 'ASSIGNMENTS');

-- CreateEnum
CREATE TYPE "EduImportStatus" AS ENUM ('UPLOADED', 'PREVIEW', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EduStudentLoginMode" AS ENUM ('PIN', 'PICTURE');

-- CreateEnum
CREATE TYPE "EduActivityType" AS ENUM ('WRITTEN', 'SPOKEN', 'QUIZ');

-- CreateEnum
CREATE TYPE "EduAiStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "EduActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EduSubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "EduMasteryLevel" AS ENUM ('NOT_YET', 'ALMOST', 'MASTERED');

-- CreateEnum
CREATE TYPE "EduGuardianRelation" AS ENUM ('MAE', 'PAI', 'AVO_AVO', 'TIO_TIA', 'TUTOR_LEGAL', 'OUTRO');

-- CreateTable
CREATE TABLE "EduUser" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "loginFailedCount" INTEGER NOT NULL DEFAULT 0,
    "loginLockedUntil" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EduUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduPlatformAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduPlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduAccountState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordSetAt" TIMESTAMP(3),

    CONSTRAINT "EduAccountState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduNetwork" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "ibgeCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gradeConfig" JSONB NOT NULL,
    "requireTrackApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduMembership" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "role" "EduRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduSchool" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inepCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EduSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduFamilyTip" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduFamilyTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduSchoolYear" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EduSchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTerm" (
    "id" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "EduTermStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "EduTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduSubject" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EduSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduCurriculumItem" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "stage" "EduStage" NOT NULL,
    "gradeYear" INTEGER NOT NULL,
    "shift" "EduShift",
    "weeklyHours" INTEGER NOT NULL,

    CONSTRAINT "EduCurriculumItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduClass" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "EduStage" NOT NULL,
    "gradeYear" INTEGER NOT NULL,
    "shift" "EduShift" NOT NULL,
    "accessCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultLoginMode" "EduStudentLoginMode" NOT NULL DEFAULT 'PIN',

    CONSTRAINT "EduClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduClassSubject" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "isExtra" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EduClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduStudent" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "enrollmentCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "pinHash" TEXT NOT NULL,
    "pinFailedCount" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" TIMESTAMP(3),
    "guardianConsentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loginMode" "EduStudentLoginMode" NOT NULL DEFAULT 'PIN',
    "pictureSecretHash" TEXT,
    "cardVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduEnrollment" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "status" "EduEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "EduEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTeachingPlan" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "schoolId" TEXT,
    "subjectId" TEXT NOT NULL,
    "stage" "EduStage" NOT NULL,
    "gradeYear" INTEGER NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "EduPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "EduTeachingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduPlanUnit" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "termOrder" INTEGER,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "bnccSkills" TEXT[],

    CONSTRAINT "EduPlanUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTopic" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plannedDate" TIMESTAMP(3),
    "taughtAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduAssessment" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "termId" TEXT,
    "title" TEXT NOT NULL,
    "type" "EduAssessmentType" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "maxScore" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "appliedAt" TIMESTAMP(3),
    "status" "EduAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "topicIds" TEXT[],
    "aiChallengeId" TEXT,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "EduAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduGradeEntry" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "value" DECIMAL(5,2),
    "absent" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    "correctionId" TEXT,
    "enteredById" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "EduGradeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduGradeCorrection" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromEntryId" TEXT NOT NULL,
    "newValue" DECIMAL(5,2),
    "newAbsent" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EduCorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "EduGradeCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTermClosure" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "closedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "averages" JSONB NOT NULL,
    "rootHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,

    CONSTRAINT "EduTermClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduAuditLog" (
    "id" TEXT NOT NULL,
    "networkId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduImportBatch" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "schoolId" TEXT,
    "kind" "EduImportKind" NOT NULL,
    "status" "EduImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "columnMap" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "EduImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduInvite" (
    "id" TEXT NOT NULL,
    "networkId" TEXT,
    "schoolId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "EduInviteRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "userId" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduActivity" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "topicId" TEXT,
    "assessmentId" TEXT,
    "type" "EduActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "rubric" JSONB NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "maxAudioSec" INTEGER,
    "opensAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "status" "EduActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduQuizQuestion" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "EduQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduFeedbackReport" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduFeedbackReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduSubmission" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "EduSubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "text" TEXT,
    "audioKey" TEXT,
    "transcript" TEXT,
    "quizAnswers" JSONB,
    "aiScore" DECIMAL(5,2),
    "aiFeedback" JSONB,
    "masteryLevel" "EduMasteryLevel",
    "skillId" TEXT,
    "teacherScore" DECIMAL(5,2),
    "teacherNote" TEXT,
    "aiStatus" "EduAiStatus",
    "aiAttempts" INTEGER NOT NULL DEFAULT 0,
    "aiLastError" TEXT,
    "aiCostMs" INTEGER,
    "aiCostTokens" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduClassSession" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "EduClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduSessionPresence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduSessionPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "EduActivitySkill" (
    "activityId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "EduActivitySkill_pkey" PRIMARY KEY ("activityId","skillId")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "EduDiagnosticItem" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "activityId" TEXT NOT NULL,

    CONSTRAINT "EduDiagnosticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTrackItem" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "activityId" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "EduTrackItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTrackAssignment" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "classId" TEXT,
    "studentId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "forced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EduTrackAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTrackProgress" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "completedItemIds" TEXT[],
    "lastActivityAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EduTrackProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduTeacherAlert" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "studentId" TEXT,
    "trackId" TEXT,
    "skillId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduTeacherAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduGuardian" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "loginFailedCount" INTEGER NOT NULL DEFAULT 0,
    "loginLockedUntil" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "EduGuardianConsent" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "EduGuardianConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TrackSkills" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "EduUser_networkId_idx" ON "EduUser"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "EduUser_networkId_email_key" ON "EduUser"("networkId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "EduPlatformAdmin_userId_key" ON "EduPlatformAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EduAccountState_userId_key" ON "EduAccountState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EduNetwork_ibgeCode_key" ON "EduNetwork"("ibgeCode");

-- CreateIndex
CREATE INDEX "EduMembership_userId_idx" ON "EduMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EduMembership_networkId_userId_schoolId_role_key" ON "EduMembership"("networkId", "userId", "schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "EduSchool_networkId_inepCode_key" ON "EduSchool"("networkId", "inepCode");

-- CreateIndex
CREATE INDEX "EduFamilyTip_networkId_idx" ON "EduFamilyTip"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "EduFamilyTip_studentId_weekStart_key" ON "EduFamilyTip"("studentId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "EduSchoolYear_networkId_year_key" ON "EduSchoolYear"("networkId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "EduTerm_schoolYearId_order_key" ON "EduTerm"("schoolYearId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EduSubject_networkId_name_key" ON "EduSubject"("networkId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EduCurriculumItem_networkId_subjectId_stage_gradeYear_shift_key" ON "EduCurriculumItem"("networkId", "subjectId", "stage", "gradeYear", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "EduClass_accessCode_key" ON "EduClass"("accessCode");

-- CreateIndex
CREATE INDEX "EduClass_networkId_schoolId_schoolYearId_idx" ON "EduClass"("networkId", "schoolId", "schoolYearId");

-- CreateIndex
CREATE INDEX "EduClassSubject_teacherId_idx" ON "EduClassSubject"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "EduClassSubject_classId_subjectId_key" ON "EduClassSubject"("classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "EduStudent_networkId_enrollmentCode_key" ON "EduStudent"("networkId", "enrollmentCode");

-- CreateIndex
CREATE INDEX "EduEnrollment_studentId_schoolYearId_idx" ON "EduEnrollment"("studentId", "schoolYearId");

-- CreateIndex
CREATE INDEX "EduEnrollment_classId_idx" ON "EduEnrollment"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "EduTeachingPlan_networkId_schoolId_subjectId_stage_gradeYea_key" ON "EduTeachingPlan"("networkId", "schoolId", "subjectId", "stage", "gradeYear", "schoolYearId", "version");

-- CreateIndex
CREATE INDEX "EduAssessment_classSubjectId_termId_idx" ON "EduAssessment"("classSubjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "EduGradeEntry_hash_key" ON "EduGradeEntry"("hash");

-- CreateIndex
CREATE INDEX "EduGradeEntry_assessmentId_studentId_idx" ON "EduGradeEntry"("assessmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EduGradeEntry_assessmentId_studentId_version_key" ON "EduGradeEntry"("assessmentId", "studentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "EduTermClosure_verificationCode_key" ON "EduTermClosure"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "EduTermClosure_classSubjectId_termId_version_key" ON "EduTermClosure"("classSubjectId", "termId", "version");

-- CreateIndex
CREATE INDEX "EduAuditLog_networkId_entity_entityId_idx" ON "EduAuditLog"("networkId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "EduAuditLog_networkId_createdAt_idx" ON "EduAuditLog"("networkId", "createdAt");

-- CreateIndex
CREATE INDEX "EduImportBatch_networkId_createdAt_idx" ON "EduImportBatch"("networkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EduInvite_tokenHash_key" ON "EduInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "EduInvite_networkId_email_idx" ON "EduInvite"("networkId", "email");

-- CreateIndex
CREATE INDEX "EduActivity_classSubjectId_status_idx" ON "EduActivity"("classSubjectId", "status");

-- CreateIndex
CREATE INDEX "EduActivity_networkId_status_idx" ON "EduActivity"("networkId", "status");

-- CreateIndex
CREATE INDEX "EduQuizQuestion_activityId_idx" ON "EduQuizQuestion"("activityId");

-- CreateIndex
CREATE INDEX "EduFeedbackReport_networkId_submissionId_idx" ON "EduFeedbackReport"("networkId", "submissionId");

-- CreateIndex
CREATE INDEX "EduSubmission_studentId_status_idx" ON "EduSubmission"("studentId", "status");

-- CreateIndex
CREATE INDEX "EduSubmission_activityId_idx" ON "EduSubmission"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "EduSubmission_activityId_studentId_attempt_key" ON "EduSubmission"("activityId", "studentId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "EduClassSession_code_key" ON "EduClassSession"("code");

-- CreateIndex
CREATE INDEX "EduClassSession_code_idx" ON "EduClassSession"("code");

-- CreateIndex
CREATE INDEX "EduClassSession_networkId_idx" ON "EduClassSession"("networkId");

-- CreateIndex
CREATE INDEX "EduSessionPresence_sessionId_idx" ON "EduSessionPresence"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "EduSessionPresence_sessionId_studentId_key" ON "EduSessionPresence"("sessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EduSkill_code_key" ON "EduSkill"("code");

-- CreateIndex
CREATE INDEX "EduSkill_subjectCode_stage_idx" ON "EduSkill"("subjectCode", "stage");

-- CreateIndex
CREATE INDEX "EduSkill_networkId_idx" ON "EduSkill"("networkId");

-- CreateIndex
CREATE INDEX "EduActivitySkill_skillId_idx" ON "EduActivitySkill"("skillId");

-- CreateIndex
CREATE INDEX "EduDiagnostic_networkId_subjectId_gradeYear_idx" ON "EduDiagnostic"("networkId", "subjectId", "gradeYear");

-- CreateIndex
CREATE INDEX "EduDiagnostic_networkId_status_idx" ON "EduDiagnostic"("networkId", "status");

-- CreateIndex
CREATE INDEX "EduDiagnosticItem_diagnosticId_idx" ON "EduDiagnosticItem"("diagnosticId");

-- CreateIndex
CREATE INDEX "EduDiagnosticItem_skillId_idx" ON "EduDiagnosticItem"("skillId");

-- CreateIndex
CREATE INDEX "EduSkillMastery_networkId_skillId_level_idx" ON "EduSkillMastery"("networkId", "skillId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "EduSkillMastery_studentId_skillId_key" ON "EduSkillMastery"("studentId", "skillId");

-- CreateIndex
CREATE INDEX "EduSkillMasteryEvent_studentId_skillId_idx" ON "EduSkillMasteryEvent"("studentId", "skillId");

-- CreateIndex
CREATE INDEX "EduSkillMasteryEvent_networkId_createdAt_idx" ON "EduSkillMasteryEvent"("networkId", "createdAt");

-- CreateIndex
CREATE INDEX "EduTrack_networkId_subjectId_gradeYear_idx" ON "EduTrack"("networkId", "subjectId", "gradeYear");

-- CreateIndex
CREATE INDEX "EduTrack_networkId_status_idx" ON "EduTrack"("networkId", "status");

-- CreateIndex
CREATE INDEX "EduTrackItem_trackId_idx" ON "EduTrackItem"("trackId");

-- CreateIndex
CREATE INDEX "EduTrackAssignment_networkId_classId_idx" ON "EduTrackAssignment"("networkId", "classId");

-- CreateIndex
CREATE INDEX "EduTrackAssignment_networkId_studentId_idx" ON "EduTrackAssignment"("networkId", "studentId");

-- CreateIndex
CREATE INDEX "EduTrackProgress_studentId_idx" ON "EduTrackProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EduTrackProgress_assignmentId_studentId_key" ON "EduTrackProgress"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "EduTeacherAlert_teacherUserId_readAt_idx" ON "EduTeacherAlert"("teacherUserId", "readAt");

-- CreateIndex
CREATE INDEX "EduTeacherAlert_networkId_createdAt_idx" ON "EduTeacherAlert"("networkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EduGuardian_userId_key" ON "EduGuardian"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EduGuardian_resetTokenHash_key" ON "EduGuardian"("resetTokenHash");

-- CreateIndex
CREATE INDEX "EduGuardian_networkId_email_idx" ON "EduGuardian"("networkId", "email");

-- CreateIndex
CREATE INDEX "EduGuardian_networkId_phone_idx" ON "EduGuardian"("networkId", "phone");

-- CreateIndex
CREATE INDEX "EduGuardianLink_networkId_studentId_idx" ON "EduGuardianLink"("networkId", "studentId");

-- CreateIndex
CREATE INDEX "EduGuardianLink_networkId_isActive_idx" ON "EduGuardianLink"("networkId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EduGuardianLink_guardianId_studentId_key" ON "EduGuardianLink"("guardianId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EduFamilyCode_studentId_key" ON "EduFamilyCode"("studentId");

-- CreateIndex
CREATE INDEX "EduFamilyCode_networkId_idx" ON "EduFamilyCode"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "EduGuardianInvite_tokenHash_key" ON "EduGuardianInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "EduGuardianInvite_networkId_idx" ON "EduGuardianInvite"("networkId");

-- CreateIndex
CREATE INDEX "EduGuardianConsent_guardianId_studentId_idx" ON "EduGuardianConsent"("guardianId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "_TrackSkills_AB_unique" ON "_TrackSkills"("A", "B");

-- CreateIndex
CREATE INDEX "_TrackSkills_B_index" ON "_TrackSkills"("B");

-- AddForeignKey
ALTER TABLE "EduPlatformAdmin" ADD CONSTRAINT "EduPlatformAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EduUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduAccountState" ADD CONSTRAINT "EduAccountState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EduUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EduUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "EduSchool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSchool" ADD CONSTRAINT "EduSchool_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSchoolYear" ADD CONSTRAINT "EduSchoolYear_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTerm" ADD CONSTRAINT "EduTerm_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "EduSchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSubject" ADD CONSTRAINT "EduSubject_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduCurriculumItem" ADD CONSTRAINT "EduCurriculumItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EduSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduClass" ADD CONSTRAINT "EduClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "EduSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduClass" ADD CONSTRAINT "EduClass_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "EduSchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduClassSubject" ADD CONSTRAINT "EduClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduStudent" ADD CONSTRAINT "EduStudent_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduEnrollment" ADD CONSTRAINT "EduEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "EduStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduEnrollment" ADD CONSTRAINT "EduEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduPlanUnit" ADD CONSTRAINT "EduPlanUnit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "EduTeachingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTopic" ADD CONSTRAINT "EduTopic_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTopic" ADD CONSTRAINT "EduTopic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "EduPlanUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduAssessment" ADD CONSTRAINT "EduAssessment_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduAssessment" ADD CONSTRAINT "EduAssessment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "EduTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduGradeEntry" ADD CONSTRAINT "EduGradeEntry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "EduAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTermClosure" ADD CONSTRAINT "EduTermClosure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "EduTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduImportBatch" ADD CONSTRAINT "EduImportBatch_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduInvite" ADD CONSTRAINT "EduInvite_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduActivity" ADD CONSTRAINT "EduActivity_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduQuizQuestion" ADD CONSTRAINT "EduQuizQuestion_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSubmission" ADD CONSTRAINT "EduSubmission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "EduActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduClassSession" ADD CONSTRAINT "EduClassSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSessionPresence" ADD CONSTRAINT "EduSessionPresence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EduClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduActivitySkill" ADD CONSTRAINT "EduActivitySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduDiagnosticItem" ADD CONSTRAINT "EduDiagnosticItem_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "EduDiagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduDiagnosticItem" ADD CONSTRAINT "EduDiagnosticItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSkillMastery" ADD CONSTRAINT "EduSkillMastery_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduSkillMasteryEvent" ADD CONSTRAINT "EduSkillMasteryEvent_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTrackItem" ADD CONSTRAINT "EduTrackItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "EduTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTrackAssignment" ADD CONSTRAINT "EduTrackAssignment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "EduTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduTrackProgress" ADD CONSTRAINT "EduTrackProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EduTrackAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduGuardian" ADD CONSTRAINT "EduGuardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EduUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduGuardianLink" ADD CONSTRAINT "EduGuardianLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "EduGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduGuardianInvite" ADD CONSTRAINT "EduGuardianInvite_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "EduGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduGuardianConsent" ADD CONSTRAINT "EduGuardianConsent_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "EduGuardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackSkills" ADD CONSTRAINT "_TrackSkills_A_fkey" FOREIGN KEY ("A") REFERENCES "EduSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackSkills" ADD CONSTRAINT "_TrackSkills_B_fkey" FOREIGN KEY ("B") REFERENCES "EduTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

