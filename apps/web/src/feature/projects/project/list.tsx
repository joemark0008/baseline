import { useMutation } from '@apollo/client/react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { TaskDialog } from '../components/TaskDialog'
import { TaskList } from '../components/TaskList'
import type { InlineTaskPatch } from '../components/TaskListRow'
import { useShortcut } from '../components/use-shortcut'
import { useOptimisticMoves } from '../dnd/use-optimistic-moves'
import { allTasks, applyWorkFilters, message, workSortOf } from '../lib'
import { PROJECT, UPDATE_PROJECT_TASK } from '../operations'
import { useProject } from './context'
import { WorkFilters } from './work-filters'
import { useWorkSearch } from './work-search'

/** US2: the plan as a grouped list; replaces the former flat table (the old URL redirects here). */
export function ProjectListView() {
  const { project } = useProject()
  const { search, setSearch } = useWorkSearch()
  const [creating, setCreating] = useState(false)
  const quickAdd = useRef<HTMLInputElement>(null)
  const focusQuickAdd = useCallback(() => quickAdd.current?.focus(), [])
  const { tasks, move } = useOptimisticMoves(allTasks(project))
  const [update] = useMutation(UPDATE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const visible = applyWorkFilters(tasks, search)
  useShortcut('n', focusQuickAdd, project.can.edit)

  async function inlineChange(id: string, patch: InlineTaskPatch) {
    try {
      await update({ variables: { input: { id, ...patch } } })
    } catch (e) {
      toast.error(message(e))
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>List</CardTitle>
            <CardDescription>
              Work grouped by phase. Edit status, owner, priority and due date in place; drag a row
              into another phase to re-plan it. Press <kbd className="rounded border px-1">n</kbd>{' '}
              to add a task.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            New task
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <WorkFilters project={project} withSort />
          <TaskList
            projectId={project.id}
            tasks={visible}
            phases={project.phases}
            members={project.members.map((m) => m.user)}
            canEdit={project.can.edit}
            sort={workSortOf(search)}
            onMove={move}
            onOpen={(task) => setSearch({ task })}
            onInlineChange={inlineChange}
            onResetSort={() => setSearch({ sort: 'manual' })}
            quickAddRef={quickAdd}
          />
        </CardContent>
      </Card>
      {creating ? <TaskDialog open onOpenChange={setCreating} project={project} /> : null}
      <TaskDetailSheet
        taskId={search.task ?? null}
        project={project}
        onClose={() => setSearch({ task: undefined })}
      />
    </>
  )
}
