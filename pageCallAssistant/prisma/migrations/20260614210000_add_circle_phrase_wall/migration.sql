-- CreateTable: phrase wall for circles
CREATE TABLE IF NOT EXISTS "CirclePhrase" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "translation" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CirclePhrase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CirclePhraseLike" (
    "id" TEXT NOT NULL,
    "phraseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CirclePhraseLike_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CirclePhrase_circleId_idx" ON "CirclePhrase"("circleId");
CREATE INDEX IF NOT EXISTS "CirclePhraseLike_phraseId_idx" ON "CirclePhraseLike"("phraseId");
CREATE UNIQUE INDEX IF NOT EXISTS "CirclePhraseLike_phraseId_userId_key" ON "CirclePhraseLike"("phraseId", "userId");

ALTER TABLE "CirclePhrase" ADD CONSTRAINT "CirclePhrase_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePhrase" ADD CONSTRAINT "CirclePhrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePhraseLike" ADD CONSTRAINT "CirclePhraseLike_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "CirclePhrase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePhraseLike" ADD CONSTRAINT "CirclePhraseLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
