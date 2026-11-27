import { useMutation } from '@apollo/client/react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { TaskPriority, TaskStatus } from '@/graphql/codegen/graphql'
import {
  label,
  message,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ProjectData,
  type TaskData,
} from '../lib'
import { CREATE_PROJECT_TASK, PROJECT, PROJECT_TASK, UPDATE_PROJECT_TASK } from '../operations'
import { PersonSelect } from './PersonSelect'

export interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectData
  /** Absent to create. */
  task?: TaskData | null
  /** Prefill for a new task (e.g. "Record as task" from a stakeholder). */
  initial?: { phaseId?: string; title?: string; description?: string }
}

/** Create or edit a task: title, phase, owner, status, priority, dates and predecessor (FR-005, FR-006). */
export function TaskDialog({ open, onOpenChange, project, task, initial }: TaskDialogProps) {
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const members = project.members.map((m) => m.user)
  const others = phases.flatMap((p) => p.tasks).filter((t) => t.id !== task?.id)
  const [title, setTitle] = useState(task?.title ?? initial?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? initial?.description ?? '')
  const [phaseId, setPhaseId] = useState(task?.phaseId ?? initial?.phaseId ?? phases[0]?.id ?? '')
  const [ownerId, setOwnerId] = useState(task?.owner?.id ?? '')
  const [status, setStatus] = useState<string>(task?.status ?? 'UPCOMING')
  const [priority, setPriority] = useState<string>(task?.priority ?? 'MEDIUM')
  const [startDate, setStartDate] = useState(task?.startDate ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [predecessorId, setPredecessorId] = useState(task?.predecessor?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [createTask, creating] = useMutation(CREATE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const [updateTask, updating] = useMutation(UPDATE_PROJECT_TASK, {
    refetchQueries: [PROJECT, PROJECT_TASK],
  })
  const busy = creating.loading || updating.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (startDate && dueDate && dueDate < startDate) {
      setError('Due date must not be before start date')
      return
    }
    const common = {
      title,
      description: description || null,
      ownerId: ownerId || null,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      startDate: startDate || null,
      dueDate: dueDate || null,
      predecessorId: predecessorId || null,
    }
    try {
      if (task) {
        await updateTask({ variables: { input: { id: task.id, phaseId, ...common } } })
        toast.success(`${title} saved`)
      } else {
        await createTask({ variables: { input: { projectId: project.id, phaseId, ...common } } })
        toast.success(`${title} created`)
      }
      onOpenChange(false)
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              Work is assigned to one accountable owner and tracked on the timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={160}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={4000}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-phase">Phase</Label>
              <NativeSelect
                id="task-phase"
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                required
              >
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-owner">Owner</Label>
              <PersonSelect
                id="task-owner"
                people={members}
                value={ownerId}
                onChange={setOwnerId}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-status">Status</Label>
              <NativeSelect
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-priority">Priority</Label>
              <NativeSelect
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {TASK_PRIORITIES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-start">Start</Label>
              <Input
                id="task-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due">Due</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-predecessor">Depends on</Label>
            <NativeSelect
              id="task-predecessor"
              value={predecessorId}
              onChange={(e) => setPredecessorId(e.target.value)}
            >
              <option value="">No dependency</option>
              {others.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              A task cannot depend on itself or on a task that depends on it.
            </p>
          </div>
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : task ? 'Save' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
