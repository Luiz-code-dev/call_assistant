-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('POST', 'LIVE_SESSION', 'ACHIEVEMENT', 'CHALLENGE_COMPLETED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "activityType" "ActivityType" NOT NULL DEFAULT 'POST';
ALTER TABLE "Post" ADD COLUMN "activityMeta" JSONB;

-- CreateIndex
CREATE INDEX "Post_activityType_idx" ON "Post"("activityType");
