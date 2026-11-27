import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Board } from '../components/Board'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { TaskDialog } from '../components/TaskDialog'
import { useShortcut } from '../components/use-shortcut'
import { useOptimisticMoves } from '../dnd/use-optimistic-moves'
import { allTasks, applyWorkFilters } from '../lib'
import { useProject } from './context'
import { WorkFilters } from './work-filters'
import { useWorkSearch } from './work-search'

/** US1: the status board. Drops save in the background and roll back with a reason on failure. */
export function ProjectBoardView() {
  const { project } = useProject()
  const { search, setSearch } = useWorkSearch()
  const [creating, setCreating] = useState(false)
  const openCreate = useCallback(() => setCreating(true), [])
  const { tasks, move } = useOptimisticMoves(allTasks(project))
  const visible = applyWorkFilters(tasks, search)
  useShortcut('n', openCreate, project.can.edit)
  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Board</CardTitle>
            <CardDescription>
              Drag a card to change its status or order. Each card's menu does the same without a
              pointer. Press <kbd className="rounded border px-1">n</kbd> for a new task.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            New task
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <WorkFilters project={project} />
          <Board
            tasks={visible}
            phases={project.phases}
            canEdit={project.can.edit}
            onMove={move}
            onOpen={(task) => setSearch({ task })}
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
