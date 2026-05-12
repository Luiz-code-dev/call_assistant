-- AlterTable User: add B2B profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobTitle"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- CreateTable Organization
CREATE TABLE "Organization" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "logoUrl"   TEXT,
    "domain"    TEXT,
    "industry"  TEXT,
    "plan"      TEXT NOT NULL DEFAULT 'teams',
    "ownerId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx"    ON "Organization"("slug");
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

-- CreateTable OrgMember
CREATE TABLE "OrgMember" (
    "id"         TEXT NOT NULL,
    "orgId"      TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "role"       TEXT NOT NULL DEFAULT 'member',
    "jobTitle"   TEXT,
    "department" TEXT,
    "commScore"  INTEGER NOT NULL DEFAULT 0,
    "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgMember_orgId_userId_key" ON "OrgMember"("orgId", "userId");
CREATE INDEX "OrgMember_orgId_idx"  ON "OrgMember"("orgId");
CREATE INDEX "OrgMember_userId_idx" ON "OrgMember"("userId");

ALTER TABLE "OrgMember"
    ADD CONSTRAINT "OrgMember_orgId_fkey"  FOREIGN KEY ("orgId")  REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId")  REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable OrgTeam
CREATE TABLE "OrgTeam" (
    "id"        TEXT NOT NULL,
    "orgId"     TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "focus"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgTeam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgTeam_orgId_idx" ON "OrgTeam"("orgId");

ALTER TABLE "OrgTeam"
    ADD CONSTRAINT "OrgTeam_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable OrgTeamMember
CREATE TABLE "OrgTeamMember" (
    "id"       TEXT NOT NULL,
    "teamId"   TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "OrgTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgTeamMember_teamId_memberId_key" ON "OrgTeamMember"("teamId", "memberId");
CREATE INDEX "OrgTeamMember_teamId_idx"   ON "OrgTeamMember"("teamId");
CREATE INDEX "OrgTeamMember_memberId_idx" ON "OrgTeamMember"("memberId");

ALTER TABLE "OrgTeamMember"
    ADD CONSTRAINT "OrgTeamMember_teamId_fkey"   FOREIGN KEY ("teamId")   REFERENCES "OrgTeam"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "OrgTeamMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrgMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable OrgInvite
CREATE TABLE "OrgInvite" (
    "id"        TEXT NOT NULL,
    "orgId"     TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'member',
    "token"     TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgInvite_token_key"      ON "OrgInvite"("token");
CREATE INDEX "OrgInvite_orgId_status_idx"      ON "OrgInvite"("orgId", "status");
CREATE INDEX "OrgInvite_email_status_idx"      ON "OrgInvite"("email", "status");

ALTER TABLE "OrgInvite"
    ADD CONSTRAINT "OrgInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CorporateChallenge
CREATE TABLE "CorporateChallenge" (
    "id"          TEXT NOT NULL,
    "orgId"       TEXT NOT NULL,
    "teamId"      TEXT,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "scenario"    TEXT,
    "targetRole"  TEXT,
    "startsAt"    TIMESTAMP(3) NOT NULL,
    "endsAt"      TIMESTAMP(3) NOT NULL,
    "createdBy"   TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CorporateChallenge_orgId_idx"               ON "CorporateChallenge"("orgId");
CREATE INDEX "CorporateChallenge_orgId_startsAt_endsAt_idx" ON "CorporateChallenge"("orgId", "startsAt", "endsAt");

ALTER TABLE "CorporateChallenge"
    ADD CONSTRAINT "CorporateChallenge_orgId_fkey"  FOREIGN KEY ("orgId")  REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "CorporateChallenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "OrgTeam"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable CorpChallengeSubmission
CREATE TABLE "CorpChallengeSubmission" (
    "id"              TEXT NOT NULL,
    "challengeId"     TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "orgId"           TEXT NOT NULL,
    "content"         TEXT NOT NULL,
    "audioUrl"        TEXT,
    "clarityScore"    INTEGER,
    "confidenceScore" INTEGER,
    "fluencyScore"    INTEGER,
    "contextScore"    INTEGER,
    "totalScore"      INTEGER,
    "feedback"        TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorpChallengeSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CorpChallengeSubmission_challengeId_idx"    ON "CorpChallengeSubmission"("challengeId");
CREATE INDEX "CorpChallengeSubmission_userId_orgId_idx"   ON "CorpChallengeSubmission"("userId", "orgId");
CREATE INDEX "CorpChallengeSubmission_orgId_createdAt_idx" ON "CorpChallengeSubmission"("orgId", "createdAt");

ALTER TABLE "CorpChallengeSubmission"
    ADD CONSTRAINT "CorpChallengeSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "CorporateChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "CorpChallengeSubmission_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id")              ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CorporateCertification
CREATE TABLE "CorporateCertification" (
    "id"          TEXT NOT NULL,
    "orgId"       TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "level"       TEXT NOT NULL,
    "score"       INTEGER NOT NULL,
    "fluency"     DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "pdfUrl"      TEXT,
    "issuedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporateCertification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CorporateCertification_orgId_userId_idx"  ON "CorporateCertification"("orgId", "userId");
CREATE INDEX "CorporateCertification_orgId_issuedAt_idx" ON "CorporateCertification"("orgId", "issuedAt");

ALTER TABLE "CorporateCertification"
    ADD CONSTRAINT "CorporateCertification_orgId_fkey"  FOREIGN KEY ("orgId")  REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "CorporateCertification_userId_fkey" FOREIGN KEY ("userId")  REFERENCES "User"("id")         ON DELETE CASCADE  ON UPDATE CASCADE;

-- CreateTable OrgLiveSession
CREATE TABLE "OrgLiveSession" (
    "id"          TEXT NOT NULL,
    "orgId"       TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "duration"    INTEGER,
    "sessionId"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgLiveSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgLiveSession_orgId_idx"           ON "OrgLiveSession"("orgId");
CREATE INDEX "OrgLiveSession_orgId_userId_idx"    ON "OrgLiveSession"("orgId", "userId");
CREATE INDEX "OrgLiveSession_orgId_createdAt_idx" ON "OrgLiveSession"("orgId", "createdAt");

ALTER TABLE "OrgLiveSession"
    ADD CONSTRAINT "OrgLiveSession_orgId_fkey"  FOREIGN KEY ("orgId")  REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "OrgLiveSession_userId_fkey" FOREIGN KEY ("userId")  REFERENCES "User"("id")         ON DELETE CASCADE  ON UPDATE CASCADE;
