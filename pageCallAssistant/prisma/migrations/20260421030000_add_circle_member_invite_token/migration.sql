-- Add inviteToken to CircleMember for direct email invites
ALTER TABLE "CircleMember" ADD COLUMN "inviteToken" TEXT;
CREATE UNIQUE INDEX "CircleMember_inviteToken_key" ON "CircleMember"("inviteToken");
