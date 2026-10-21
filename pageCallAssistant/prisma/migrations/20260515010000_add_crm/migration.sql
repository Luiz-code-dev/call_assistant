-- Add crmAccess to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "crmAccess" BOOLEAN NOT NULL DEFAULT false;

-- Create CrmLead table
CREATE TABLE IF NOT EXISTS "CrmLead" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "phone"       TEXT,
  "company"     TEXT,
  "role"        TEXT,
  "teamSize"    TEXT,
  "origin"      TEXT NOT NULL DEFAULT 'manual',
  "status"      TEXT NOT NULL DEFAULT 'novo',
  "score"       INTEGER NOT NULL DEFAULT 0,
  "notes"       TEXT,
  "lastContact" TIMESTAMP(3),
  "assignedTo"  TEXT,
  "userId"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmLead_status_idx"    ON "CrmLead"("status");
CREATE INDEX IF NOT EXISTS "CrmLead_email_idx"     ON "CrmLead"("email");
CREATE INDEX IF NOT EXISTS "CrmLead_createdAt_idx" ON "CrmLead"("createdAt");

-- Create CrmActivity table
CREATE TABLE IF NOT EXISTS "CrmActivity" (
  "id"        TEXT NOT NULL,
  "leadId"    TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'note',
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmActivity_leadId_idx" ON "CrmActivity"("leadId");

ALTER TABLE "CrmActivity"
  ADD CONSTRAINT "CrmActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE;
