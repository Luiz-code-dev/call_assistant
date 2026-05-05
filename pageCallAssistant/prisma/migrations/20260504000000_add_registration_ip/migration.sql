-- Add registrationIp column to User (nullable, no breaking change)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registrationIp" TEXT;
