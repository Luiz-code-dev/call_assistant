-- Migration: add_platform_admin
-- Adds EduPlatformAdmin, EduAccountState, EduInviteRole enum
-- Makes EduInvite.networkId nullable and changes role to EduInviteRole
-- Makes EduAuditLog.networkId nullable for platform-level audit entries

-- 1. New enum EduInviteRole
CREATE TYPE "EduInviteRole" AS ENUM (
  'PLATFORM_ADMIN',
  'NETWORK_ADMIN',
  'COORDINATOR',
  'SCHOOL_ADMIN',
  'TEACHER'
);

-- 2. EduPlatformAdmin table
CREATE TABLE IF NOT EXISTS "EduPlatformAdmin" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduPlatformAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduPlatformAdmin_userId_key" ON "EduPlatformAdmin"("userId");
ALTER TABLE "EduPlatformAdmin"
  ADD CONSTRAINT "EduPlatformAdmin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. EduAccountState table
CREATE TABLE IF NOT EXISTS "EduAccountState" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "passwordSetAt" TIMESTAMP(3),
  CONSTRAINT "EduAccountState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EduAccountState_userId_key" ON "EduAccountState"("userId");
ALTER TABLE "EduAccountState"
  ADD CONSTRAINT "EduAccountState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. EduInvite: make networkId nullable
ALTER TABLE "EduInvite" ALTER COLUMN "networkId" DROP NOT NULL;

-- 5. EduInvite: change role column from EduRole to EduInviteRole
ALTER TABLE "EduInvite"
  ALTER COLUMN "role" TYPE "EduInviteRole"
  USING "role"::text::"EduInviteRole";

-- 6. EduAuditLog: make networkId nullable (platform-level actions have no network)
ALTER TABLE "EduAuditLog" ALTER COLUMN "networkId" DROP NOT NULL;
