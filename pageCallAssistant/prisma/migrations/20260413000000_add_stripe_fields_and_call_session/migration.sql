-- AlterTable: add Stripe tracking fields to User
ALTER TABLE "User" ADD COLUMN "stripeCustomerId"     TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus"   TEXT;
ALTER TABLE "User" ADD COLUMN "planRenewsAt"         TIMESTAMP(3);

-- CreateTable: CallSession
CREATE TABLE "CallSession" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"     TIMESTAMP(3),
    "duration"    INTEGER,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "language"    TEXT,
    "transcript"  TEXT,
    "summary"     TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
