-- AlterTable
ALTER TABLE "project_task" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- Feature 011 backfill: tasks already complete take their last update time as the completion time.
UPDATE "project_task" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETE';
