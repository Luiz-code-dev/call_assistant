-- CreateEnum
CREATE TYPE "TenantKind" AS ENUM ('PUBLIC_NETWORK', 'PRIVATE_SCHOOL');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'MIGRATING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('SHARED', 'DEDICATED');

-- CreateEnum
CREATE TYPE "LoginKind" AS ENUM ('STAFF', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "CodeKind" AS ENUM ('CLASS_ACCESS', 'CLASS_SESSION', 'FAMILY_CODE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TenantKind" NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "dbKey" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'SHARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDatabase" (
    "key" TEXT NOT NULL,
    "envVar" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'railway-us',
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TenantDatabase_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LoginIndex" (
    "id" TEXT NOT NULL,
    "kind" "LoginKind" NOT NULL,
    "identifier" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "LoginIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeIndex" (
    "code" TEXT NOT NULL,
    "kind" "CodeKind" NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CodeIndex_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDailyStats" (
    "tenantId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "activeStudents" INTEGER NOT NULL DEFAULT 0,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "skillsRecovered" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TenantDailyStats_pkey" PRIMARY KEY ("tenantId","day")
);

-- CreateIndex
CREATE INDEX "LoginIndex_kind_identifier_idx" ON "LoginIndex"("kind", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "LoginIndex_kind_identifier_tenantId_key" ON "LoginIndex"("kind", "identifier", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_dbKey_fkey" FOREIGN KEY ("dbKey") REFERENCES "TenantDatabase"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

