import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Board } from '../components/Board'
import { FoldAll } from '../components/FoldAll'
import { EmptyWork } from '../components/EmptyWork'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { TaskDialog } from '../components/TaskDialog'
import { useShortcut } from '../components/use-shortcut'
import { useOptimisticMoves } from '../dnd/use-optimistic-moves'
import { allTasks, phaseAt } from '../lib'
import { useReadability } from '../readability'
import { useProject } from './context'
import { useVisibleWork } from './use-visible-work'
import { WorkFilters } from './work-filters'

/** US1: the status board. Drops save in the background and roll back with a reason on failure. */
export function ProjectBoardView() {
  const { project } = useProject()
  const [creating, setCreating] = useState(false)
  const openCreate = useCallback(() => setCreating(true), [])
  const { tasks, move } = useOptimisticMoves(allTasks(project))
  const work = useVisibleWork(tasks, project, { recentDoneVisible: true })
  const readability = useReadability()
  const lanes = readability.layout === 'lanes'
  const selected = work.search.phase ? phaseAt(project.phases, work.search.phase) : null
  // FR-018: a phase filter narrows the lanes to that phase; a number past the plan shows none.
  const lanePhases = lanes && work.search.phase ? (selected ? [selected] : []) : project.phases
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
          <WorkFilters project={project} hiddenDone={work.hiddenDone} withLayout />
          {lanes ? (
            <div className="flex justify-end">
              <FoldAll folding={readability} phaseIds={lanePhases.map((p) => p.id)} />
            </div>
          ) : null}
          {work.reason ? (
            <EmptyWork
              reason={work.reason}
              hiddenDone={work.hiddenMatches}
              onShowDone={work.showAllDone}
              onClear={work.clearFilters}
            />
          ) : null}
          <Board
            tasks={work.visible}
            allTasks={tasks}
            phases={lanePhases}
            canEdit={project.can.edit}
            layout={readability.layout}
            folding={readability}
            filtered={work.filtered}
            hiddenDone={work.hiddenDone}
            onShowDone={work.showDone ? undefined : work.showAllDone}
            onMove={move}
            onOpen={(task) => work.setSearch({ task })}
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
