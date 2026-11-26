export type PhaseStatus = 'complete' | 'in_progress' | 'upcoming' | 'at_risk'
export type TaskStatus = 'complete' | 'in_progress' | 'upcoming' | 'blocked' | 'overdue'
export type ReadinessStatus = 'ready' | 'in_review' | 'needs_work' | 'not_started'

export interface PreviewTask {
  id: string
  title: string
  phaseId: string
  ownerId: string
  dueDate: string
  status: TaskStatus
  priority: 'high' | 'medium' | 'low'
  predecessorIds: string[]
}

export interface PreviewPhase {
  id: string
  name: string
  startDate: string
  endDate: string
  status: PhaseStatus
  progress: number
}

export interface PreviewTeamMember {
  id: string
  name: string
  initials: string
  role: string
  organization: 'Hospital' | 'HISD3'
}

export interface PreviewDeliverable {
  id: string
  title: string
  phaseId: string
  ownerId: string
  status: ReadinessStatus
  dueDate?: string
}

export interface PreviewActivity {
  id: string
  actorId: string
  action: string
  target: string
  createdAt: string
}

export const previewProject = {
  name: 'Northstar Community Hospital',
  implementationName: 'HIS3 Implementation',
  status: 'on_track' as const,
  startDate: '2026-06-01',
  targetGoLiveDate: '2027-02-16',
  overallProgress: 68,
  currentPhaseId: 'training',
  phases: [
    {
      id: 'kickoff',
      name: 'Kickoff',
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      status: 'complete',
      progress: 100,
    },
    {
      id: 'data-gathering',
      name: 'Data Gathering',
      startDate: '2026-06-16',
      endDate: '2026-07-31',
      status: 'complete',
      progress: 100,
    },
    {
      id: 'data-build-up',
      name: 'Data Build-Up',
      startDate: '2026-08-01',
      endDate: '2026-09-30',
      status: 'complete',
      progress: 100,
    },
    {
      id: 'requirements-analysis',
      name: 'Requirements Analysis',
      startDate: '2026-09-01',
      endDate: '2026-10-31',
      status: 'complete',
      progress: 100,
    },
    {
      id: 'training',
      name: 'Training',
      startDate: '2026-11-01',
      endDate: '2026-12-15',
      status: 'in_progress',
      progress: 56,
    },
    {
      id: 'pre-go-live',
      name: 'Pre-Go-Live',
      startDate: '2026-12-16',
      endDate: '2027-02-15',
      status: 'upcoming',
      progress: 0,
    },
    {
      id: 'go-live',
      name: 'Go-Live',
      startDate: '2027-02-16',
      endDate: '2027-02-28',
      status: 'upcoming',
      progress: 0,
    },
    {
      id: 'post-go-live',
      name: 'Post-Go-Live Support',
      startDate: '2027-03-01',
      endDate: '2027-04-30',
      status: 'upcoming',
      progress: 0,
    },
    {
      id: 'continuous-improvement',
      name: 'Monitoring & Continuous Improvement',
      startDate: '2027-05-01',
      endDate: '2027-06-30',
      status: 'upcoming',
      progress: 0,
    },
  ] satisfies PreviewPhase[],
  team: [
    {
      id: 'amina',
      name: 'Amina Yusuf',
      initials: 'AY',
      role: 'Client Project Lead',
      organization: 'Hospital',
    },
    {
      id: 'david',
      name: 'David Chen',
      initials: 'DC',
      role: 'Implementation Manager',
      organization: 'HISD3',
    },
    {
      id: 'maria',
      name: 'Maria Santos',
      initials: 'MS',
      role: 'Nursing Superuser',
      organization: 'Hospital',
    },
    {
      id: 'mark',
      name: 'Mark Abad',
      initials: 'MA',
      role: 'Data Consultant',
      organization: 'HISD3',
    },
    {
      id: 'leah',
      name: 'Leah Okafor',
      initials: 'LO',
      role: 'Training Lead',
      organization: 'HISD3',
    },
  ] satisfies PreviewTeamMember[],
  tasks: [
    {
      id: 'task-1',
      title: 'Validate nursing workflows with department leads',
      phaseId: 'requirements-analysis',
      ownerId: 'amina',
      dueDate: '2026-11-20',
      status: 'overdue',
      priority: 'high',
      predecessorIds: [],
    },
    {
      id: 'task-2',
      title: 'Review pharmacy item master',
      phaseId: 'data-build-up',
      ownerId: 'mark',
      dueDate: '2026-11-28',
      status: 'in_progress',
      priority: 'high',
      predecessorIds: [],
    },
    {
      id: 'task-3',
      title: 'Run superuser training workshop',
      phaseId: 'training',
      ownerId: 'leah',
      dueDate: '2026-12-02',
      status: 'upcoming',
      priority: 'high',
      predecessorIds: [],
    },
    {
      id: 'task-4',
      title: 'Confirm training completion by department',
      phaseId: 'training',
      ownerId: 'maria',
      dueDate: '2026-12-12',
      status: 'upcoming',
      priority: 'medium',
      predecessorIds: ['task-3'],
    },
    {
      id: 'task-5',
      title: 'Approve cutover and contingency checklist',
      phaseId: 'pre-go-live',
      ownerId: 'david',
      dueDate: '2027-01-22',
      status: 'upcoming',
      priority: 'high',
      predecessorIds: ['task-4'],
    },
    {
      id: 'task-6',
      title: 'Validate user access matrix',
      phaseId: 'data-build-up',
      ownerId: 'amina',
      dueDate: '2026-09-15',
      status: 'complete',
      priority: 'medium',
      predecessorIds: [],
    },
    {
      id: 'task-7',
      title: 'Schedule go-live command center',
      phaseId: 'go-live',
      ownerId: 'david',
      dueDate: '2027-02-01',
      status: 'upcoming',
      priority: 'medium',
      predecessorIds: ['task-5'],
    },
  ] satisfies PreviewTask[],
  deliverables: [
    {
      id: 'deliverable-1',
      title: 'Department & service catalog',
      phaseId: 'data-gathering',
      ownerId: 'amina',
      status: 'ready',
      dueDate: '2026-07-20',
    },
    {
      id: 'deliverable-2',
      title: 'User access matrix',
      phaseId: 'data-build-up',
      ownerId: 'amina',
      status: 'ready',
      dueDate: '2026-09-15',
    },
    {
      id: 'deliverable-3',
      title: 'Pharmacy item master',
      phaseId: 'data-build-up',
      ownerId: 'mark',
      status: 'in_review',
      dueDate: '2026-11-28',
    },
    {
      id: 'deliverable-4',
      title: 'Data migration dry run',
      phaseId: 'pre-go-live',
      ownerId: 'david',
      status: 'not_started',
      dueDate: '2027-01-15',
    },
    {
      id: 'deliverable-5',
      title: 'Training completion sign-off',
      phaseId: 'training',
      ownerId: 'leah',
      status: 'needs_work',
      dueDate: '2026-12-15',
    },
  ] satisfies PreviewDeliverable[],
  activity: [
    {
      id: 'activity-1',
      actorId: 'maria',
      action: 'completed the review for',
      target: 'Nursing workflow mapping',
      createdAt: '2026-11-25T09:15:00Z',
    },
    {
      id: 'activity-2',
      actorId: 'david',
      action: 'updated the target date for',
      target: 'Pre-Go-Live readiness review',
      createdAt: '2026-11-24T14:30:00Z',
    },
    {
      id: 'activity-3',
      actorId: 'mark',
      action: 'submitted for review',
      target: 'Pharmacy item master',
      createdAt: '2026-11-24T08:45:00Z',
    },
  ] satisfies PreviewActivity[],
}
