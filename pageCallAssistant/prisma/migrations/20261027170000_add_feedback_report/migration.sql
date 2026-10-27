-- "Reportar este retorno" (app e web). Aditivo.
CREATE TABLE IF NOT EXISTS "EduFeedbackReport" (
  "id" TEXT NOT NULL,
  "networkId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduFeedbackReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EduFeedbackReport_networkId_submissionId_idx" ON "EduFeedbackReport"("networkId", "submissionId");
