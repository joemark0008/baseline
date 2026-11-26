-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessChangeKind" ADD VALUE 'PASSWORD_RESET_LINK_CREATED';
ALTER TYPE "AccessChangeKind" ADD VALUE 'PASSWORD_RESET_LINK_CANCELLED';
ALTER TYPE "AccessChangeKind" ADD VALUE 'PASSWORD_RESET_COMPLETED';
ALTER TYPE "AccessChangeKind" ADD VALUE 'PASSWORD_CHANGED';

-- CreateTable
CREATE TABLE "password_reset_link" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_link_tokenHash_key" ON "password_reset_link"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_link_userId_idx" ON "password_reset_link"("userId");

-- AddForeignKey
ALTER TABLE "password_reset_link" ADD CONSTRAINT "password_reset_link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_link" ADD CONSTRAINT "password_reset_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
