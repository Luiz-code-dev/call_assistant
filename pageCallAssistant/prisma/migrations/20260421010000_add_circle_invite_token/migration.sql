-- Add inviteToken to Circle for invite-link system
ALTER TABLE "Circle" ADD COLUMN "inviteToken" TEXT;
CREATE UNIQUE INDEX "Circle_inviteToken_key" ON "Circle"("inviteToken");
