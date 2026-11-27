import { useMutation } from '@apollo/client/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyWork } from '../components/EmptyWork'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { TaskDialog } from '../components/TaskDialog'
import { TaskList } from '../components/TaskList'
import type { InlineTaskPatch } from '../components/TaskListRow'
import { useShortcut } from '../components/use-shortcut'
import { useOptimisticMoves } from '../dnd/use-optimistic-moves'
import { allTasks, doneCountByPhase, message, workSortOf } from '../lib'
import { PROJECT, UPDATE_PROJECT_TASK } from '../operations'
import { useReadability } from '../readability'
import { useProject } from './context'
import { useVisibleWork } from './use-visible-work'
import { WorkFilters } from './work-filters'

/** US2: the plan as a grouped list; replaces the former flat table (the old URL redirects here). */
export function ProjectListView() {
  const { project } = useProject()
  const [creating, setCreating] = useState(false)
  const quickAdd = useRef<HTMLInputElement>(null)
  const focusPending = useRef(false)
  const folding = useReadability()
  const firstPhase = [...project.phases].sort((a, b) => a.order - b.order)[0]
  const focusQuickAdd = useCallback(() => {
    // FR-015: the quick-add of a folded phase unfolds it first; the focus lands after the render.
    if (firstPhase && folding.isCollapsed(firstPhase.id)) {
      focusPending.current = true
      folding.toggle(firstPhase.id)
    } else quickAdd.current?.focus()
  }, [firstPhase, folding])
  useEffect(() => {
    if (focusPending.current && quickAdd.current) {
      focusPending.current = false
      quickAdd.current.focus()
    }
  })
  const { tasks, move } = useOptimisticMoves(allTasks(project))
  const [update] = useMutation(UPDATE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const work = useVisibleWork(tasks, project)
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
          <WorkFilters project={project} withSort hiddenDone={work.hiddenDone} />
          {work.reason && work.reason !== 'none' ? (
            <EmptyWork
              reason={work.reason}
              hiddenDone={work.hiddenMatches}
              onShowDone={work.showAllDone}
              onClear={work.clearFilters}
            />
          ) : null}
          <TaskList
            projectId={project.id}
            tasks={work.visible}
            allTasks={tasks}
            doneCounts={doneCountByPhase(tasks)}
            filtered={work.filtered}
            phases={project.phases}
            members={project.members.map((m) => m.user)}
            canEdit={project.can.edit}
            sort={workSortOf(work.search)}
            onMove={move}
            onOpen={(task) => work.setSearch({ task })}
            onInlineChange={inlineChange}
            onResetSort={() => work.setSearch({ sort: 'manual' })}
            quickAddRef={quickAdd}
            folding={folding}
          />
        </CardContent>
      </Card>
      {creating ? <TaskDialog open onOpenChange={setCreating} project={project} /> : null}
      <TaskDetailSheet
        taskId={work.search.task ?? null}
        project={project}
        onClose={() => work.setSearch({ task: undefined })}
      />
    </>
  )
}
