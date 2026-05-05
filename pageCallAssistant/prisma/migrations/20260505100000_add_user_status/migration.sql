-- Add 24-hour user status fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusText" VARCHAR(150);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusEmoji" VARCHAR(8);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusExpires" TIMESTAMP(3);
