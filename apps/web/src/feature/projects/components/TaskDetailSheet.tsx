import { useMutation, useQuery } from '@apollo/client/react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { UpdateTaskInput } from '@/graphql/codegen/graphql'
import {
  allTasks,
  formatDateTime,
  initials,
  label,
  message,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ProjectData,
} from '../lib'
import {
  ADD_TASK_COMMENT,
  DELETE_PROJECT_TASK,
  PROJECT,
  PROJECT_ACTIVITY,
  PROJECT_TASK,
  UPDATE_PROJECT_TASK,
} from '../operations'
import { InlineField } from './InlineField'
import { OverdueBadge, StatusBadge } from './StatusBadge'

export interface TaskDetailSheetProps {
  taskId: string | null
  project: ProjectData
  onClose: () => void
}

/**
 * A task's side panel: every field edits in place, with its comments and its own activity (US5
 * scenario 2). Non-modal, so the Board or List behind stays usable.
 */
export function TaskDetailSheet({ taskId, project, onClose }: TaskDetailSheetProps) {
  const { data, loading, error } = useQuery(PROJECT_TASK, {
    variables: { id: taskId ?? '' },
    skip: !taskId,
    fetchPolicy: 'cache-and-network',
  })
  const activity = useQuery(PROJECT_ACTIVITY, {
    variables: { projectId: project.id, targetId: taskId ?? '', perPage: 20 },
    skip: !taskId,
    fetchPolicy: 'cache-and-network',
  })
  const [deleting, setDeleting] = useState(false)
  const [body, setBody] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [commentError, setCommentError] = useState<string | null>(null)
  const [update] = useMutation(UPDATE_PROJECT_TASK, {
    refetchQueries: [PROJECT_TASK, PROJECT, PROJECT_ACTIVITY],
  })
  const [addComment, adding] = useMutation(ADD_TASK_COMMENT, {
    refetchQueries: [PROJECT_TASK, PROJECT],
  })
  const [deleteTask] = useMutation(DELETE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const task = data?.projectTask ?? null
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const phase = task ? phases.find((p) => p.id === task.phaseId) : null
  const canEdit = project.can.edit

  async function save(patch: Omit<UpdateTaskInput, 'id'>) {
    if (!task) return
    try {
      await update({ variables: { input: { id: task.id, ...patch } } })
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function comment(e: FormEvent) {
    e.preventDefault()
    if (!task) return
    setCommentError(null)
    try {
      await addComment({
        variables: { input: { taskId: task.id, body, mentionUserIds: mentions } },
      })
      setBody('')
      setMentions([])
    } catch (err) {
      setCommentError(message(err))
    }
  }

  async function remove(): Promise<string | null> {
    if (!task) return null
    try {
      await deleteTask({ variables: { id: task.id } })
    } catch (err) {
      return message(err)
    }
    toast.success(`${task.title} deleted`)
    onClose()
    return null
  }

  const others = allTasks(project).filter((t) => t.id !== task?.id)
  return (
    <Sheet modal={false} open={taskId !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent
        className="flex w-full flex-col gap-4 overflow-y-auto border-l shadow-xl sm:max-w-xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{task?.title ?? (loading ? 'Loading…' : 'Task')}</SheetTitle>
          <SheetDescription>
            {phase
              ? `${phase.name} · ${task?.owner?.name ?? 'Unassigned'}`
              : 'Task details and discussion'}
          </SheetDescription>
        </SheetHeader>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {task ? (
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-wrap items-center gap-2">
              {task.overdue ? <OverdueBadge /> : null}
              <StatusBadge value={task.status} />
              <StatusBadge value={task.priority} />
              {task.predecessorConflict ? (
                <span className="text-xs text-destructive">
                  Starts before its predecessor is due
                </span>
              ) : null}
            </div>
            <InlineField
              id="task-title"
              label="Title"
              kind="text"
              value={task.title}
              maxLength={160}
              disabled={!canEdit}
              onCommit={(title) => save({ title })}
            />
            <InlineField
              id="task-description"
              label="Description"
              kind="textarea"
              value={task.description ?? ''}
              maxLength={4000}
              disabled={!canEdit}
              onCommit={(description) => save({ description: description || null })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <InlineField
                id="task-phase"
                label="Phase"
                kind="select"
                value={task.phaseId}
                disabled={!canEdit}
                options={phases.map((p) => ({ value: p.id, label: p.name }))}
                onCommit={(phaseId) => save({ phaseId })}
              />
              <InlineField
                id="task-owner"
                label="Owner"
                kind="select"
                value={task.owner?.id ?? ''}
                emptyLabel="Unassigned"
                disabled={!canEdit}
                options={project.members.map((m) => ({ value: m.user.id, label: m.user.name }))}
                onCommit={(ownerId) => save({ ownerId: ownerId || null })}
              />
              <InlineField
                id="task-status"
                label="Status"
                kind="select"
                value={task.status}
                disabled={!canEdit}
                options={TASK_STATUSES.map((s) => ({ value: s, label: label(s) }))}
                onCommit={(status) => save({ status: status as UpdateTaskInput['status'] })}
              />
              <InlineField
                id="task-priority"
                label="Priority"
                kind="select"
                value={task.priority}
                disabled={!canEdit}
                options={TASK_PRIORITIES.map((p) => ({ value: p, label: label(p) }))}
                onCommit={(priority) => save({ priority: priority as UpdateTaskInput['priority'] })}
              />
              <InlineField
                id="task-start"
                label="Start"
                kind="date"
                value={task.startDate ?? ''}
                disabled={!canEdit}
                onCommit={(startDate) => save({ startDate: startDate || null })}
              />
              <InlineField
                id="task-due"
                label="Due"
                kind="date"
                value={task.dueDate ?? ''}
                disabled={!canEdit}
                onCommit={(dueDate) => save({ dueDate: dueDate || null })}
              />
              <InlineField
                id="task-predecessor"
                label="Depends on"
                kind="select"
                value={task.predecessor?.id ?? ''}
                emptyLabel="Nothing"
                disabled={!canEdit}
                options={others.map((t) => ({ value: t.id, label: t.title }))}
                onCommit={(predecessorId) => save({ predecessorId: predecessorId || null })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Updated {formatDateTime(task.updatedAt)}
            </p>
            {canEdit ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleting(true)}
                >
                  Delete task
                </Button>
              </div>
            ) : null}
            <section aria-label="Comments" className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Comments</h3>
              {task.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {task.comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <Avatar size="sm" aria-label={c.author.name}>
                        <AvatarFallback>{initials(c.author.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{c.author.name}</span>{' '}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(c.createdAt)}
                          </span>
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                        {c.mentions.length ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Mentioned {c.mentions.map((m) => m.name).join(', ')}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <form onSubmit={comment} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="comment-body">Add a comment</Label>
                  <Textarea
                    id="comment-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    required
                    maxLength={4000}
                  />
                </div>
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs text-muted-foreground">
                    Mention (they get an email)
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {project.members.map((m) => (
                      <label key={m.user.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={mentions.includes(m.user.id)}
                          onCheckedChange={(checked) =>
                            setMentions((prev) =>
                              checked
                                ? [...prev, m.user.id]
                                : prev.filter((id) => id !== m.user.id),
                            )
                          }
                          aria-label={`Mention ${m.user.name}`}
                        />
                        {m.user.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {commentError ? (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{commentError}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" size="sm" className="self-start" disabled={adding.loading}>
                  {adding.loading ? 'Posting…' : 'Comment'}
                </Button>
              </form>
            </section>
            <section aria-label="Task activity" className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Activity</h3>
              {activity.error ? (
                <p className="text-sm text-destructive">{activity.error.message}</p>
              ) : (activity.data?.projectActivity.data.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {activity.loading ? 'Loading…' : 'No activity yet.'}
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {activity.data!.projectActivity.data.map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="font-medium">{a.actor?.name ?? 'System'}</span>{' '}
                      <span className="text-muted-foreground">{a.summary}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}
        {task ? (
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={`Delete ${task.title}?`}
            description="The task and its comments are removed. This can't be undone."
            confirmLabel="Delete"
            onConfirm={remove}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
