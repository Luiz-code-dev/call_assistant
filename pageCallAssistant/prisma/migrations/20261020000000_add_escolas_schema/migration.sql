-- Migration aditiva: SpeakFlow Escolas
-- Somente CREATE. Nenhum DROP, ALTER COLUMN em tabela existente.

-- Enums
CREATE TYPE "EduRole" AS ENUM ('NETWORK_ADMIN', 'COORDINATOR', 'SCHOOL_ADMIN', 'TEACHER');
CREATE TYPE "EduStage" AS ENUM ('EARLY_CHILDHOOD', 'ELEMENTARY_EARLY', 'ELEMENTARY_LATE', 'HIGH_SCHOOL', 'EJA');
CREATE TYPE "EduShift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'FULL_TIME');
CREATE TYPE "EduTermStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "EduEnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'PROMOTED', 'RETAINED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "EduPlanStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "EduAssessmentType" AS ENUM ('EXAM', 'ASSIGNMENT', 'PROJECT', 'AI_ACTIVITY', 'RECOVERY', 'OTHER');
CREATE TYPE "EduAssessmentStatus" AS ENUM ('DRAFT', 'OPEN', 'GRADING', 'PUBLISHED');
CREATE TYPE "EduCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- EduNetwork
CREATE TABLE "EduNetwork" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "city"        TEXT NOT NULL,
    "state"       CHAR(2) NOT NULL,
    "ibgeCode"    TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "gradeConfig" JSONB NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduNetwork_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduNetwork_ibgeCode_key" ON "EduNetwork"("ibgeCode");

-- EduSchool
CREATE TABLE "EduSchool" (
    "id"        TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "inepCode"  TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "EduSchool_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduSchool_networkId_inepCode_key" ON "EduSchool"("networkId", "inepCode");
ALTER TABLE "EduSchool" ADD CONSTRAINT "EduSchool_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduMembership
CREATE TABLE "EduMembership" (
    "id"        TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "schoolId"  TEXT,
    "role"      "EduRole" NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduMembership_networkId_userId_schoolId_role_key"
    ON "EduMembership"("networkId", "userId", "schoolId", "role");
CREATE INDEX "EduMembership_userId_idx" ON "EduMembership"("userId");
ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduMembership" ADD CONSTRAINT "EduMembership_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "EduSchool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EduSchoolYear
CREATE TABLE "EduSchoolYear" (
    "id"        TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "year"      INTEGER NOT NULL,
    "startsAt"  TIMESTAMP(3) NOT NULL,
    "endsAt"    TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EduSchoolYear_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduSchoolYear_networkId_year_key" ON "EduSchoolYear"("networkId", "year");
ALTER TABLE "EduSchoolYear" ADD CONSTRAINT "EduSchoolYear_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduTerm
CREATE TABLE "EduTerm" (
    "id"           TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "order"        INTEGER NOT NULL,
    "startsAt"     TIMESTAMP(3) NOT NULL,
    "endsAt"       TIMESTAMP(3) NOT NULL,
    "status"       "EduTermStatus" NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "EduTerm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduTerm_schoolYearId_order_key" ON "EduTerm"("schoolYearId", "order");
ALTER TABLE "EduTerm" ADD CONSTRAINT "EduTerm_schoolYearId_fkey"
    FOREIGN KEY ("schoolYearId") REFERENCES "EduSchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduSubject
CREATE TABLE "EduSubject" (
    "id"        TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "area"      TEXT,
    "color"     TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "EduSubject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduSubject_networkId_name_key" ON "EduSubject"("networkId", "name");
ALTER TABLE "EduSubject" ADD CONSTRAINT "EduSubject_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduCurriculumItem
CREATE TABLE "EduCurriculumItem" (
    "id"          TEXT NOT NULL,
    "networkId"   TEXT NOT NULL,
    "subjectId"   TEXT NOT NULL,
    "stage"       "EduStage" NOT NULL,
    "gradeYear"   INTEGER NOT NULL,
    "shift"       "EduShift",
    "weeklyHours" INTEGER NOT NULL,
    CONSTRAINT "EduCurriculumItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduCurriculumItem_networkId_subjectId_stage_gradeYear_shift_key"
    ON "EduCurriculumItem"("networkId", "subjectId", "stage", "gradeYear", "shift");
ALTER TABLE "EduCurriculumItem" ADD CONSTRAINT "EduCurriculumItem_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "EduSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduClass
CREATE TABLE "EduClass" (
    "id"           TEXT NOT NULL,
    "networkId"    TEXT NOT NULL,
    "schoolId"     TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "stage"        "EduStage" NOT NULL,
    "gradeYear"    INTEGER NOT NULL,
    "shift"        "EduShift" NOT NULL,
    "accessCode"   TEXT NOT NULL,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "EduClass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduClass_accessCode_key" ON "EduClass"("accessCode");
CREATE INDEX "EduClass_networkId_schoolId_schoolYearId_idx"
    ON "EduClass"("networkId", "schoolId", "schoolYearId");
ALTER TABLE "EduClass" ADD CONSTRAINT "EduClass_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "EduSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduClass" ADD CONSTRAINT "EduClass_schoolYearId_fkey"
    FOREIGN KEY ("schoolYearId") REFERENCES "EduSchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduClassSubject
CREATE TABLE "EduClassSubject" (
    "id"        TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "classId"   TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "isExtra"   BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EduClassSubject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduClassSubject_classId_subjectId_key" ON "EduClassSubject"("classId", "subjectId");
CREATE INDEX "EduClassSubject_teacherId_idx" ON "EduClassSubject"("teacherId");
ALTER TABLE "EduClassSubject" ADD CONSTRAINT "EduClassSubject_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduStudent
CREATE TABLE "EduStudent" (
    "id"                TEXT NOT NULL,
    "networkId"         TEXT NOT NULL,
    "enrollmentCode"    TEXT NOT NULL,
    "fullName"          TEXT NOT NULL,
    "birthDate"         TIMESTAMP(3),
    "pinHash"           TEXT NOT NULL,
    "pinFailedCount"    INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil"    TIMESTAMP(3),
    "guardianConsentAt" TIMESTAMP(3),
    "isActive"          BOOLEAN NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduStudent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduStudent_networkId_enrollmentCode_key"
    ON "EduStudent"("networkId", "enrollmentCode");
ALTER TABLE "EduStudent" ADD CONSTRAINT "EduStudent_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "EduNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduEnrollment
CREATE TABLE "EduEnrollment" (
    "id"           TEXT NOT NULL,
    "networkId"    TEXT NOT NULL,
    "studentId"    TEXT NOT NULL,
    "classId"      TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "status"       "EduEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"      TIMESTAMP(3),
    CONSTRAINT "EduEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EduEnrollment_studentId_schoolYearId_idx" ON "EduEnrollment"("studentId", "schoolYearId");
CREATE INDEX "EduEnrollment_classId_idx" ON "EduEnrollment"("classId");
ALTER TABLE "EduEnrollment" ADD CONSTRAINT "EduEnrollment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "EduStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduEnrollment" ADD CONSTRAINT "EduEnrollment_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "EduClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduTeachingPlan
CREATE TABLE "EduTeachingPlan" (
    "id"           TEXT NOT NULL,
    "networkId"    TEXT NOT NULL,
    "schoolId"     TEXT,
    "subjectId"    TEXT NOT NULL,
    "stage"        "EduStage" NOT NULL,
    "gradeYear"    INTEGER NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "version"      INTEGER NOT NULL DEFAULT 1,
    "status"       "EduPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "title"        TEXT NOT NULL,
    "objectives"   TEXT NOT NULL,
    "createdById"  TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt"   TIMESTAMP(3),
    CONSTRAINT "EduTeachingPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduTeachingPlan_networkId_schoolId_subjectId_stage_gradeYear_schoolYearId_version_key"
    ON "EduTeachingPlan"("networkId", "schoolId", "subjectId", "stage", "gradeYear", "schoolYearId", "version");

-- EduPlanUnit
CREATE TABLE "EduPlanUnit" (
    "id"         TEXT NOT NULL,
    "planId"     TEXT NOT NULL,
    "termOrder"  INTEGER,
    "order"      INTEGER NOT NULL,
    "title"      TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "bnccSkills" TEXT[] NOT NULL DEFAULT '{}',
    CONSTRAINT "EduPlanUnit_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "EduPlanUnit" ADD CONSTRAINT "EduPlanUnit_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "EduTeachingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduTopic
CREATE TABLE "EduTopic" (
    "id"             TEXT NOT NULL,
    "networkId"      TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "unitId"         TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "plannedDate"    TIMESTAMP(3),
    "taughtAt"       TIMESTAMP(3),
    "createdById"    TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduTopic_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "EduTopic" ADD CONSTRAINT "EduTopic_classSubjectId_fkey"
    FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduTopic" ADD CONSTRAINT "EduTopic_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "EduPlanUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduAssessment
CREATE TABLE "EduAssessment" (
    "id"             TEXT NOT NULL,
    "networkId"      TEXT NOT NULL,
    "classSubjectId" TEXT NOT NULL,
    "termId"         TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "type"           "EduAssessmentType" NOT NULL,
    "weight"         DECIMAL(5,2) NOT NULL DEFAULT 1,
    "maxScore"       DECIMAL(5,2) NOT NULL DEFAULT 10,
    "appliedAt"      TIMESTAMP(3),
    "status"         "EduAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "topicIds"       TEXT[] NOT NULL DEFAULT '{}',
    "aiChallengeId"  TEXT,
    "createdById"    TEXT NOT NULL,
    "publishedAt"    TIMESTAMP(3),
    CONSTRAINT "EduAssessment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EduAssessment_classSubjectId_termId_idx" ON "EduAssessment"("classSubjectId", "termId");
ALTER TABLE "EduAssessment" ADD CONSTRAINT "EduAssessment_classSubjectId_fkey"
    FOREIGN KEY ("classSubjectId") REFERENCES "EduClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EduAssessment" ADD CONSTRAINT "EduAssessment_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "EduTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduGradeEntry (ledger imutável)
CREATE TABLE "EduGradeEntry" (
    "id"           TEXT NOT NULL,
    "networkId"    TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId"    TEXT NOT NULL,
    "value"        DECIMAL(5,2),
    "absent"       BOOLEAN NOT NULL DEFAULT false,
    "version"      INTEGER NOT NULL,
    "correctionId" TEXT,
    "enteredById"  TEXT NOT NULL,
    "enteredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevHash"     TEXT NOT NULL,
    "hash"         TEXT NOT NULL,
    "signature"    TEXT NOT NULL,
    "keyId"        TEXT NOT NULL,
    CONSTRAINT "EduGradeEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduGradeEntry_hash_key" ON "EduGradeEntry"("hash");
CREATE UNIQUE INDEX "EduGradeEntry_assessmentId_studentId_version_key"
    ON "EduGradeEntry"("assessmentId", "studentId", "version");
CREATE INDEX "EduGradeEntry_assessmentId_studentId_idx"
    ON "EduGradeEntry"("assessmentId", "studentId");
ALTER TABLE "EduGradeEntry" ADD CONSTRAINT "EduGradeEntry_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "EduAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduGradeCorrection
CREATE TABLE "EduGradeCorrection" (
    "id"            TEXT NOT NULL,
    "networkId"     TEXT NOT NULL,
    "assessmentId"  TEXT NOT NULL,
    "studentId"     TEXT NOT NULL,
    "fromEntryId"   TEXT NOT NULL,
    "newValue"      DECIMAL(5,2),
    "newAbsent"     BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"        "EduCorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById"   TEXT,
    "decidedAt"     TIMESTAMP(3),
    "decisionNote"  TEXT,
    CONSTRAINT "EduGradeCorrection_pkey" PRIMARY KEY ("id")
);

-- EduTermClosure (imutável)
CREATE TABLE "EduTermClosure" (
    "id"               TEXT NOT NULL,
    "networkId"        TEXT NOT NULL,
    "classSubjectId"   TEXT NOT NULL,
    "termId"           TEXT NOT NULL,
    "version"          INTEGER NOT NULL,
    "closedById"       TEXT NOT NULL,
    "closedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "averages"         JSONB NOT NULL,
    "rootHash"         TEXT NOT NULL,
    "signature"        TEXT NOT NULL,
    "keyId"            TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    CONSTRAINT "EduTermClosure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduTermClosure_verificationCode_key" ON "EduTermClosure"("verificationCode");
CREATE UNIQUE INDEX "EduTermClosure_classSubjectId_termId_version_key"
    ON "EduTermClosure"("classSubjectId", "termId", "version");
ALTER TABLE "EduTermClosure" ADD CONSTRAINT "EduTermClosure_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "EduTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EduAuditLog (imutável)
CREATE TABLE "EduAuditLog" (
    "id"        TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId"   TEXT NOT NULL,
    "action"    TEXT NOT NULL,
    "entity"    TEXT NOT NULL,
    "entityId"  TEXT NOT NULL,
    "metadata"  JSONB,
    "ip"        TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EduAuditLog_networkId_entity_entityId_idx"
    ON "EduAuditLog"("networkId", "entity", "entityId");
CREATE INDEX "EduAuditLog_networkId_createdAt_idx"
    ON "EduAuditLog"("networkId", "createdAt");
