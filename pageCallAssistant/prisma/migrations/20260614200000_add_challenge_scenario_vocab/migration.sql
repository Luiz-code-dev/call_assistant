-- AlterTable: add situational scenario and target vocabulary to written challenges
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "scenario" TEXT;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "targetVocab" TEXT;
