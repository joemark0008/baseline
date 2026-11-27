import { useMutation } from '@apollo/client/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Gantt } from '../components/Gantt'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { EmptyWork } from '../components/EmptyWork'
import { FoldAll } from '../components/FoldAll'
import { allTasks, message, type DateRange } from '../lib'
import { PROJECT, UPDATE_PROJECT_PHASE, UPDATE_PROJECT_TASK } from '../operations'
import { useReadability } from '../readability'
import { useProject } from './context'
import { useVisibleWork } from './use-visible-work'
import { WorkFilters } from './work-filters'

/** FR-007 and US3: the schedule, now rescheduled by dragging bars (phases for Managers only). */
export function ProjectTimelineTab() {
  const { project } = useProject()
  const [updateTask] = useMutation(UPDATE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const [updatePhase] = useMutation(UPDATE_PROJECT_PHASE, { refetchQueries: [PROJECT] })
  const work = useVisibleWork(allTasks(project), project)
  const folding = useReadability()
  const collapsed = new Set(
    project.phases.filter((p) => folding.isCollapsed(p.id)).map((p) => p.id),
  )
  const shown = new Set(work.visible.map((t) => t.id))
  const phases = project.phases.map((p) => ({
    ...p,
    tasks: p.tasks.filter((t) => shown.has(t.id)),
  }))

  async function taskDates(id: string, range: DateRange) {
    try {
      await updateTask({
        variables: { input: { id, startDate: range.startDate, dueDate: range.dueDate } },
      })
    } catch (e) {
      toast.error(message(e))
      throw e
    }
  }

  async function phaseDates(id: string, range: { startDate: string; endDate: string }) {
    try {
      await updatePhase({ variables: { input: { id, ...range } } })
    } catch (e) {
      toast.error(message(e))
      throw e
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Phase schedule with task dates and dependencies. Drag a bar to reschedule it, or select
            a task to open it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <WorkFilters project={project} hiddenDone={work.hiddenDone} />
          <div className="flex justify-end">
            <FoldAll folding={folding} phaseIds={project.phases.map((p) => p.id)} />
          </div>
          {work.reason && work.reason !== 'none' ? (
            <EmptyWork
              reason={work.reason}
              hiddenDone={work.hiddenMatches}
              onShowDone={work.showAllDone}
              onClear={work.clearFilters}
            />
          ) : null}
          <Gantt
            phases={phases}
            startDate={project.startDate}
            targetGoLiveDate={project.targetGoLiveDate}
            onSelectTask={(task) => work.setSearch({ task })}
            onTaskDatesChange={project.can.edit ? taskDates : undefined}
            onPhaseDatesChange={project.can.manage ? phaseDates : undefined}
            collapsedPhaseIds={collapsed}
            onTogglePhase={folding.toggle}
          />
        </CardContent>
      </Card>
      <TaskDetailSheet
        taskId={work.search.task ?? null}
        project={project}
        onClose={() => work.setSearch({ task: undefined })}
      />
    </>
  )
}
