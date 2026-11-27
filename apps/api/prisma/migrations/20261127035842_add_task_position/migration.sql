-- AlterTable
ALTER TABLE "project_task" ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "project_task_projectId_position_idx" ON "project_task"("projectId", "position");

-- Feature 010: one manual order per project for the Board and the List. Backfill existing tasks
-- in creation order so nothing visibly moves on deploy.
UPDATE "project_task" AS t
SET "position" = ranked.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id") AS rn
  FROM "project_task"
) AS ranked
WHERE t."id" = ranked."id";
