-- Add winnerAwarded flag to Challenge
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "winnerAwarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Friendship
CREATE TABLE IF NOT EXISTS "Friendship" (
    "id"          TEXT        NOT NULL,
    "requesterId" TEXT        NOT NULL,
    "addresseeId" TEXT        NOT NULL,
    "status"      TEXT        NOT NULL DEFAULT 'pending',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_requesterId_addresseeId_key"
    ON "Friendship"("requesterId", "addresseeId");

CREATE INDEX IF NOT EXISTS "Friendship_addresseeId_status_idx"
    ON "Friendship"("addresseeId", "status");

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey"
    FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Message (AES-256-GCM encrypted content)
CREATE TABLE IF NOT EXISTS "Message" (
    "id"         TEXT        NOT NULL,
    "senderId"   TEXT        NOT NULL,
    "receiverId" TEXT        NOT NULL,
    "content"    TEXT        NOT NULL,
    "iv"         TEXT        NOT NULL,
    "isRead"     BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Message_senderId_receiverId_idx"
    ON "Message"("senderId", "receiverId");

CREATE INDEX IF NOT EXISTS "Message_receiverId_isRead_idx"
    ON "Message"("receiverId", "isRead");

ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
