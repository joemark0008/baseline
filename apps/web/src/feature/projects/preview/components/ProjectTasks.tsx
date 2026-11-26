import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { previewProject, type PreviewTask, type TaskStatus } from '../fixture'

type TaskFilter = 'all' | 'overdue' | 'in_progress' | 'complete'

const filters: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'complete', label: 'Complete' },
]

const statusLabel: Record<TaskStatus, string> = {
  complete: 'Complete',
  in_progress: 'In progress',
  upcoming: 'Upcoming',
  blocked: 'Blocked',
  overdue: 'Overdue',
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  if (status === 'overdue' || status === 'blocked') {
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
        {statusLabel[status]}
      </Badge>
    )
  }
  if (status === 'complete') return <Badge variant="secondary">{statusLabel[status]}</Badge>
  if (status === 'in_progress') return <Badge>{statusLabel[status]}</Badge>
  return <Badge variant="outline">{statusLabel[status]}</Badge>
}

const priorityLabel: Record<PreviewTask['priority'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function PriorityBadge({ priority }: { priority: PreviewTask['priority'] }) {
  if (priority === 'high') {
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive" variant="outline">
        {priorityLabel[priority]}
      </Badge>
    )
  }
  return <Badge variant="outline">{priorityLabel[priority]}</Badge>
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  )
}

export function ProjectTasks() {
  const [filter, setFilter] = useState<TaskFilter>('all')
  const tasks = previewProject.tasks.filter((task) => filter === 'all' || task.status === filter)
  const phases = new Map(previewProject.phases.map((phase) => [phase.id, phase.name]))
  const team = new Map(previewProject.team.map((member) => [member.id, member]))

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1.5">
          <CardTitle>Task queue</CardTitle>
          <CardDescription>Representative work across the implementation lifecycle</CardDescription>
        </div>
        <div aria-label="Filter tasks" className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              aria-pressed={filter === item.id}
              key={item.id}
              onClick={() => setFilter(item.id)}
              size="sm"
              type="button"
              variant={filter === item.id ? 'secondary' : 'ghost'}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Table aria-label="Project tasks">
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const owner = team.get(task.ownerId)
              return (
                <TableRow key={task.id}>
                  <TableCell className="min-w-64 font-medium">{task.title}</TableCell>
                  <TableCell className="min-w-40 text-muted-foreground">
                    {phases.get(task.phaseId)}
                  </TableCell>
                  <TableCell className="min-w-36">{owner?.name ?? 'Unassigned'}</TableCell>
                  <TableCell className="min-w-32 text-muted-foreground">
                    {formatDate(task.dueDate)}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={task.priority} />
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                </TableRow>
              )
            })}
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No tasks match this filter.
                  </p>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
