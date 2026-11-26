-- CreateEnum
CREATE TYPE "RoleKind" AS ENUM ('ADMIN', 'MEMBER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccessChangeKind" AS ENUM ('ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'USER_REACTIVATED');

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "description" TEXT,
    "kind" "RoleKind" NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_grant" (
    "roleId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "role_grant_pkey" PRIMARY KEY ("roleId","area","action")
);

-- CreateTable
CREATE TABLE "user_access" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_access_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "access_change" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" "AccessChangeKind" NOT NULL,
    "roleId" TEXT,
    "userId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_nameKey_key" ON "role"("nameKey");

-- CreateIndex
CREATE INDEX "user_access_roleId_idx" ON "user_access"("roleId");

-- CreateIndex
CREATE INDEX "access_change_createdAt_idx" ON "access_change"("createdAt" DESC);

-- Built-in roles (fixed ids): Admin holds every permission by rule; Member starts empty.
INSERT INTO "role" ("id", "name", "nameKey", "description", "kind", "updatedAt") VALUES
  ('role_admin', 'Admin', 'admin', 'Full access to everything, including future features.', 'ADMIN', NOW()),
  ('role_member', 'Member', 'member', 'Default role for new people.', 'MEMBER', NOW());

-- Upgrade: today's admins become Admin, everyone else Member (nobody's access changes).
INSERT INTO "user_access" ("userId", "roleId", "updatedAt")
SELECT "id", CASE WHEN "role" = 'admin' THEN 'role_admin' ELSE 'role_member' END, NOW()
FROM "user";

-- Invites: carry a role instead of the admin/user string.
ALTER TABLE "invite" ADD COLUMN "roleId" TEXT;
UPDATE "invite" SET "roleId" = CASE WHEN "role" = 'admin' THEN 'role_admin' ELSE 'role_member' END;
ALTER TABLE "invite" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "invite" DROP COLUMN "role";

-- AddForeignKey
ALTER TABLE "invite" ADD CONSTRAINT "invite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_grant" ADD CONSTRAINT "role_grant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_change" ADD CONSTRAINT "access_change_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
