-- Add B2B seat control fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "b2bSeatLimit" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Add seat control and suspension fields to Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "seatLimit" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
