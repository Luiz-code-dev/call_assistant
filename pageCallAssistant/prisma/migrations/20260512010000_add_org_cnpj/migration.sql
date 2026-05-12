-- Add CNPJ validation fields to Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnpj"       TEXT UNIQUE;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "cnpjStatus" TEXT DEFAULT 'unverified';
