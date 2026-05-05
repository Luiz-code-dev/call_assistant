-- CreateTable Post
CREATE TABLE "Post" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "content"   TEXT,
    "imageUrl"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostLike
CREATE TABLE "PostLike" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostComment
CREATE TABLE "PostComment" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_userId_idx"           ON "Post"("userId");
CREATE INDEX "Post_createdAt_idx"        ON "Post"("createdAt");
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");
CREATE INDEX "PostLike_postId_idx"       ON "PostLike"("postId");
CREATE INDEX "PostComment_postId_idx"    ON "PostComment"("postId");

-- AddForeignKey
ALTER TABLE "Post"        ADD CONSTRAINT "Post_userId_fkey"        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike"    ADD CONSTRAINT "PostLike_postId_fkey"    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike"    ADD CONSTRAINT "PostLike_userId_fkey"    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
