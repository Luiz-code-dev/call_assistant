CREATE TABLE "EduSessionPresence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EduSessionPresence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EduSessionPresence_sessionId_studentId_key" ON "EduSessionPresence"("sessionId", "studentId");
CREATE INDEX "EduSessionPresence_sessionId_idx" ON "EduSessionPresence"("sessionId");
ALTER TABLE "EduSessionPresence" ADD CONSTRAINT "EduSessionPresence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EduClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
