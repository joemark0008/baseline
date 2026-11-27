-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'AT_RISK', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "DeliverableKind" AS ENUM ('OUTPUT', 'DATA_CATEGORY');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'READY');

-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ProjectActivityKind" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'PHASE_ADDED', 'PHASE_UPDATED', 'PHASE_REMOVED', 'PHASES_REORDERED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'COMMENT_ADDED', 'MEMBER_ADDED', 'MEMBER_INVITED', 'MEMBER_ROLE_CHANGED', 'MEMBER_REMOVED', 'DELIVERABLE_ADDED', 'DELIVERABLE_UPDATED', 'DELIVERABLE_REVIEWED', 'DELIVERABLE_REMOVED', 'STAKEHOLDER_ADDED', 'STAKEHOLDER_UPDATED', 'STAKEHOLDER_REMOVED');

-- AlterTable
ALTER TABLE "invite" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "projectRole" "ProjectRole";

-- CreateTable
CREATE TABLE "template_phase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "template_phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_deliverable" (
    "id" TEXT NOT NULL,
    "templatePhaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DeliverableKind" NOT NULL DEFAULT 'OUTPUT',
    "order" INTEGER NOT NULL,

    CONSTRAINT "template_deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE,
    "targetGoLiveDate" DATE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_member" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_member_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "project_phase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "ownerId" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "status" "PhaseStatus" NOT NULL DEFAULT 'UPCOMING',
    "templatePhaseId" TEXT,

    CONSTRAINT "project_phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'UPCOMING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" DATE,
    "dueDate" DATE,
    "predecessorId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comment_mention" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "task_comment_mention_pkey" PRIMARY KEY ("commentId","userId")
);

-- CreateTable
CREATE TABLE "project_deliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DeliverableKind" NOT NULL DEFAULT 'OUTPUT',
    "ownerId" TEXT,
    "reviewerId" TEXT,
    "dueDate" DATE,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewOutcome" "ReviewOutcome",
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "links" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL,
    "templateDeliverableId" TEXT,

    CONSTRAINT "project_deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stakeholder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,
    "notes" TEXT,

    CONSTRAINT "project_stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_activity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" "ProjectActivityKind" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_phase_order_key" ON "template_phase"("order");

-- CreateIndex
CREATE INDEX "template_deliverable_templatePhaseId_order_idx" ON "template_deliverable"("templatePhaseId", "order");

-- CreateIndex
CREATE INDEX "project_updatedAt_idx" ON "project"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "project_member_userId_idx" ON "project_member"("userId");

-- CreateIndex
CREATE INDEX "project_phase_projectId_order_idx" ON "project_phase"("projectId", "order");

-- CreateIndex
CREATE INDEX "project_task_projectId_phaseId_idx" ON "project_task"("projectId", "phaseId");

-- CreateIndex
CREATE INDEX "project_task_projectId_dueDate_idx" ON "project_task"("projectId", "dueDate");

-- CreateIndex
CREATE INDEX "task_comment_taskId_createdAt_idx" ON "task_comment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "project_deliverable_projectId_phaseId_order_idx" ON "project_deliverable"("projectId", "phaseId", "order");

-- CreateIndex
CREATE INDEX "project_stakeholder_projectId_idx" ON "project_stakeholder"("projectId");

-- CreateIndex
CREATE INDEX "project_activity_projectId_createdAt_idx" ON "project_activity"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "invite_projectId_idx" ON "invite"("projectId");

-- AddForeignKey
ALTER TABLE "invite" ADD CONSTRAINT "invite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_deliverable" ADD CONSTRAINT "template_deliverable_templatePhaseId_fkey" FOREIGN KEY ("templatePhaseId") REFERENCES "template_phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phase" ADD CONSTRAINT "project_phase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phase" ADD CONSTRAINT "project_phase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phase" ADD CONSTRAINT "project_phase_templatePhaseId_fkey" FOREIGN KEY ("templatePhaseId") REFERENCES "template_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task" ADD CONSTRAINT "project_task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task" ADD CONSTRAINT "project_task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task" ADD CONSTRAINT "project_task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task" ADD CONSTRAINT "project_task_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "project_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task" ADD CONSTRAINT "project_task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "project_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment_mention" ADD CONSTRAINT "task_comment_mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "task_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment_mention" ADD CONSTRAINT "task_comment_mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_templateDeliverableId_fkey" FOREIGN KEY ("templateDeliverableId") REFERENCES "template_deliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stakeholder" ADD CONSTRAINT "project_stakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stakeholder" ADD CONSTRAINT "project_stakeholder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the standard implementation template (spec 007 › Implementation Lifecycle). Projects copy it.
INSERT INTO "template_phase" ("id", "name", "description", "order") VALUES
  ('tpl_kickoff', 'Kickoff', 'Align stakeholders on project goals, scope, roles, communication, schedule and next steps.', 1),
  ('tpl_data_gathering', 'Data Gathering', 'Collect current workflows, forms, reports, systems and departmental inputs; identify gaps and sources.', 2),
  ('tpl_data_build_up', 'Data Build-Up', 'Prepare, clean, standardize, validate and review master data; track dry-run readiness and the final data freeze.', 3),
  ('tpl_requirements', 'Requirements Analysis', 'Document clinical, administrative and technical needs, workflow gaps and integration needs.', 4),
  ('tpl_training', 'Training', 'Identify users by role, assign training, prepare materials and track sessions or train-the-trainer activities.', 5),
  ('tpl_pre_go_live', 'Pre-Go-Live', 'Track readiness checks for data migration, access, infrastructure, checklist completion and contingency planning.', 6),
  ('tpl_go_live', 'Go-Live', 'Mark the planned launch and coordinate the start of live operations.', 7),
  ('tpl_post_go_live', 'Post-Go-Live Support', 'Track early issues, feedback, refresher training and fixes.', 8),
  ('tpl_monitoring', 'Monitoring & Continuous Improvement', 'Track usage and KPIs, audits, user feedback and planned improvements.', 9);

INSERT INTO "template_deliverable" ("id", "templatePhaseId", "title", "kind", "order") VALUES
  ('tpd_kickoff_charter', 'tpl_kickoff', 'Project charter and scope statement', 'OUTPUT', 1),
  ('tpd_kickoff_contacts', 'tpl_kickoff', 'Client and vendor contact list', 'OUTPUT', 2),
  ('tpd_kickoff_comms', 'tpl_kickoff', 'Communication plan and meeting cadence', 'OUTPUT', 3),
  ('tpd_kickoff_schedule', 'tpl_kickoff', 'Agreed implementation schedule', 'OUTPUT', 4),
  ('tpd_dg_workflows', 'tpl_data_gathering', 'Current workflow and forms inventory', 'OUTPUT', 1),
  ('tpd_dg_reports', 'tpl_data_gathering', 'Reports and systems inventory', 'OUTPUT', 2),
  ('tpd_dg_departments', 'tpl_data_gathering', 'Departments and service catalog', 'DATA_CATEGORY', 3),
  ('tpd_dg_users', 'tpl_data_gathering', 'Users and access matrix', 'DATA_CATEGORY', 4),
  ('tpd_dg_items', 'tpl_data_gathering', 'Items and supplies master', 'DATA_CATEGORY', 5),
  ('tpd_dg_pricing', 'tpl_data_gathering', 'Pricing and charge master', 'DATA_CATEGORY', 6),
  ('tpd_dg_tests', 'tpl_data_gathering', 'Diagnostic tests catalog', 'DATA_CATEGORY', 7),
  ('tpd_dg_suppliers', 'tpl_data_gathering', 'Suppliers master', 'DATA_CATEGORY', 8),
  ('tpd_dg_codes', 'tpl_data_gathering', 'Codes and classifications', 'DATA_CATEGORY', 9),
  ('tpd_db_templates', 'tpl_data_build_up', 'Standardized data templates issued', 'OUTPUT', 1),
  ('tpd_db_validation', 'tpl_data_build_up', 'Master data validation and sign-off', 'DATA_CATEGORY', 2),
  ('tpd_db_dry_run', 'tpl_data_build_up', 'Data migration dry run', 'OUTPUT', 3),
  ('tpd_db_freeze', 'tpl_data_build_up', 'Final data freeze', 'OUTPUT', 4),
  ('tpd_req_document', 'tpl_requirements', 'Requirements document', 'OUTPUT', 1),
  ('tpd_req_gaps', 'tpl_requirements', 'Workflow gap analysis', 'OUTPUT', 2),
  ('tpd_req_integrations', 'tpl_requirements', 'Integration needs list', 'OUTPUT', 3),
  ('tpd_tr_plan', 'tpl_training', 'Training plan by role', 'OUTPUT', 1),
  ('tpd_tr_materials', 'tpl_training', 'Training materials', 'OUTPUT', 2),
  ('tpd_tr_signoff', 'tpl_training', 'Training completion sign-off', 'OUTPUT', 3),
  ('tpd_pgl_migration', 'tpl_pre_go_live', 'Data migration readiness check', 'OUTPUT', 1),
  ('tpd_pgl_access', 'tpl_pre_go_live', 'User access and infrastructure check', 'OUTPUT', 2),
  ('tpd_pgl_checklist', 'tpl_pre_go_live', 'Go-live checklist and contingency plan', 'OUTPUT', 3),
  ('tpd_gl_command', 'tpl_go_live', 'Go-live command center schedule', 'OUTPUT', 1),
  ('tpd_gl_cutover', 'tpl_go_live', 'Cutover approval', 'OUTPUT', 2),
  ('tpd_post_issues', 'tpl_post_go_live', 'Issue log and fixes', 'OUTPUT', 1),
  ('tpd_post_refresher', 'tpl_post_go_live', 'Refresher training record', 'OUTPUT', 2),
  ('tpd_mon_kpis', 'tpl_monitoring', 'Usage and KPI report', 'OUTPUT', 1),
  ('tpd_mon_audit', 'tpl_monitoring', 'Audit and feedback review', 'OUTPUT', 2),
  ('tpd_mon_improvements', 'tpl_monitoring', 'Planned improvements backlog', 'OUTPUT', 3);
