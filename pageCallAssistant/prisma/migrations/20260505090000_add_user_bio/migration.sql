-- AlterTable: add bio column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
