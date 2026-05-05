-- CreateTable: DailyStreak
CREATE TABLE IF NOT EXISTS "DailyStreak" (
    "id"               TEXT        NOT NULL,
    "userId"           TEXT        NOT NULL,
    "currentStreak"    INTEGER     NOT NULL DEFAULT 0,
    "longestStreak"    INTEGER     NOT NULL DEFAULT 0,
    "lastActivityDate" TEXT,
    "lastSpinDate"     TEXT,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SpinHistory
CREATE TABLE IF NOT EXISTS "SpinHistory" (
    "id"          TEXT        NOT NULL,
    "userId"      TEXT        NOT NULL,
    "credits"     INTEGER     NOT NULL,
    "prizeLabel"  TEXT        NOT NULL,
    "isPremium"   BOOLEAN     NOT NULL DEFAULT false,
    "spunAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinHistory_pkey" PRIMARY KEY ("id")
);

-- Unique index: one DailyStreak record per user
CREATE UNIQUE INDEX IF NOT EXISTS "DailyStreak_userId_key" ON "DailyStreak"("userId");

-- Indexes for SpinHistory queries
CREATE INDEX IF NOT EXISTS "SpinHistory_userId_spunAt_idx" ON "SpinHistory"("userId", "spunAt" DESC);

-- Foreign keys
ALTER TABLE "DailyStreak" ADD CONSTRAINT "DailyStreak_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpinHistory" ADD CONSTRAINT "SpinHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
