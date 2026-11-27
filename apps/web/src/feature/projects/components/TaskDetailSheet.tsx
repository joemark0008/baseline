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
import {
  formatDate,
  formatDateTime,
  initials,
  message,
  type ProjectData,
  type TaskData,
} from '../lib'
import { ADD_TASK_COMMENT, DELETE_PROJECT_TASK, PROJECT, PROJECT_TASK } from '../operations'
import { OverdueBadge, StatusBadge } from './StatusBadge'
import { TaskDialog } from './TaskDialog'

export interface TaskDetailSheetProps {
  taskId: string | null
  project: ProjectData
  onClose: () => void
}

/** A task's details and its comment thread with @mentions (US3). */
export function TaskDetailSheet({ taskId, project, onClose }: TaskDetailSheetProps) {
  const { data, loading, error } = useQuery(PROJECT_TASK, {
    variables: { id: taskId ?? '' },
    skip: !taskId,
    fetchPolicy: 'cache-and-network',
  })
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [body, setBody] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [commentError, setCommentError] = useState<string | null>(null)
  const [addComment, adding] = useMutation(ADD_TASK_COMMENT, {
    refetchQueries: [PROJECT_TASK, PROJECT],
  })
  const [deleteTask] = useMutation(DELETE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const task = data?.projectTask ?? null
  const phase = task ? project.phases.find((p) => p.id === task.phaseId) : null

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

  return (
    <Sheet open={taskId !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl">
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
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Start</dt>
              <dd>{formatDate(task.startDate)}</dd>
              <dt className="text-muted-foreground">Due</dt>
              <dd className={task.overdue ? 'text-destructive' : ''}>{formatDate(task.dueDate)}</dd>
              <dt className="text-muted-foreground">Depends on</dt>
              <dd>{task.predecessor?.title ?? '—'}</dd>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDateTime(task.updatedAt)}</dd>
            </dl>
            {task.description ? (
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            ) : null}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit task
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setDeleting(true)}
              >
                Delete
              </Button>
            </div>
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
          </div>
        ) : null}
        {editing && task ? (
          <TaskDialog
            open
            onOpenChange={setEditing}
            project={project}
            task={task as unknown as TaskData}
          />
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
