-- CreateTable
CREATE TABLE "setup_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "setupTokenHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_state_pkey" PRIMARY KEY ("id")
);

-- Upgrade safety: an instance that already has an admin is already set up.
INSERT INTO "setup_state" ("id", "setupComplete", "updatedAt")
SELECT 1, EXISTS (SELECT 1 FROM "user" WHERE "role" = 'admin'), NOW()
ON CONFLICT ("id") DO NOTHING;
