-- CreateTable: ToolUsage
CREATE TABLE "ToolUsage" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "tool"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ToolUsage" ADD CONSTRAINT "ToolUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index para consultas de limite diário por userId+tool
CREATE INDEX "ToolUsage_userId_tool_createdAt_idx" ON "ToolUsage"("userId", "tool", "createdAt");
