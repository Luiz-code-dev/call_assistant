-- Add b2bAccess flag to User (gate for org creation)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "b2bAccess" BOOLEAN NOT NULL DEFAULT false;
