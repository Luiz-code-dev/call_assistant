-- CreateTable
CREATE TABLE "BuddySession" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "language"     TEXT NOT NULL DEFAULT 'pt-BR',
    "topic"        TEXT,
    "title"        TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "wordsLearned" INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuddySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuddyMessage" (
    "id"        TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role"      TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuddyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuddySession_userId_idx" ON "BuddySession"("userId");
CREATE INDEX "BuddySession_userId_createdAt_idx" ON "BuddySession"("userId", "createdAt");
CREATE INDEX "BuddyMessage_sessionId_idx" ON "BuddyMessage"("sessionId");

-- AddForeignKey
ALTER TABLE "BuddySession" ADD CONSTRAINT "BuddySession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "BuddySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
