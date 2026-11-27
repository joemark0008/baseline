import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { QueryStateRow } from '@/components/QueryStateRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OverdueBadge, StatusBadge } from '../components/StatusBadge'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { TaskDialog } from '../components/TaskDialog'
import { allTasks, formatDate, label, TASK_STATUSES } from '../lib'
import { useProject } from './context'

/** FR-005, FR-008, FR-010: the task queue with filters by phase, owner, status and overdue. */
export function ProjectTasksTab() {
  const { project } = useProject()
  const navigate = useNavigate()
  const { task: selected } = useSearch({ from: '/_protected/projects/$id/tasks' })
  const [creating, setCreating] = useState(false)
  const [phaseId, setPhaseId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [status, setStatus] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const phaseName = new Map(phases.map((p) => [p.id, p.name]))
  const tasks = allTasks(project).filter(
    (t) =>
      (!phaseId || t.phaseId === phaseId) &&
      (!ownerId || t.owner?.id === ownerId) &&
      (!status || t.status === status) &&
      (!overdueOnly || t.overdue),
  )
  const select = (task: string | undefined) =>
    navigate({ to: '/projects/$id/tasks', params: { id: project.id }, search: { task } })

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Every piece of work, its owner and when it is due.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            New task
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-4" aria-label="Filter tasks">
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-phase">Phase</Label>
              <NativeSelect
                id="filter-phase"
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
              >
                <option value="">All phases</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-owner">Owner</Label>
              <NativeSelect
                id="filter-owner"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Anyone</option>
                {project.members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filter-status">Status</Label>
              <NativeSelect
                id="filter-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Any status</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox
                checked={overdueOnly}
                onCheckedChange={(c) => setOverdueOnly(c === true)}
                aria-label="Overdue only"
              />
              Overdue only
            </label>
          </div>
          <Table aria-label="Project tasks">
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <QueryStateRow
                colSpan={6}
                loading={false}
                error={null}
                isEmpty={tasks.length === 0}
                emptyMessage="No tasks match. Create one or clear the filters."
              />
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="min-w-64">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => select(t.id)}
                    >
                      {t.title}
                    </button>
                    {t.predecessor ? (
                      <p className="text-xs text-muted-foreground">after {t.predecessor.title}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {phaseName.get(t.phaseId)}
                  </TableCell>
                  <TableCell>{t.owner?.name ?? 'Unassigned'}</TableCell>
                  <TableCell className={t.overdue ? 'text-destructive' : 'text-muted-foreground'}>
                    {formatDate(t.dueDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={t.priority} />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <StatusBadge value={t.status} />
                      {t.overdue ? <OverdueBadge /> : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {creating ? <TaskDialog open onOpenChange={setCreating} project={project} /> : null}
      <TaskDetailSheet
        taskId={selected ?? null}
        project={project}
        onClose={() => select(undefined)}
      />
    </>
  )
}
