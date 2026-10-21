-- Add statusMediaUrl (TEXT) to store photo or short video base64/URL for 24h status
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusMediaUrl" TEXT;
