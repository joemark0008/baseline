import { useMutation } from '@apollo/client/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Gantt } from '../components/Gantt'
import { TaskDetailSheet } from '../components/TaskDetailSheet'
import { applyWorkFilters, message, type DateRange } from '../lib'
import { PROJECT, UPDATE_PROJECT_PHASE, UPDATE_PROJECT_TASK } from '../operations'
import { useProject } from './context'
import { WorkFilters } from './work-filters'
import { useWorkSearch } from './work-search'

/** FR-007 and US3: the schedule, now rescheduled by dragging bars (phases for Managers only). */
export function ProjectTimelineTab() {
  const { project } = useProject()
  const { search, setSearch } = useWorkSearch()
  const [updateTask] = useMutation(UPDATE_PROJECT_TASK, { refetchQueries: [PROJECT] })
  const [updatePhase] = useMutation(UPDATE_PROJECT_PHASE, { refetchQueries: [PROJECT] })
  const phases = project.phases.map((p) => ({ ...p, tasks: applyWorkFilters(p.tasks, search) }))

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
          <WorkFilters project={project} />
          <Gantt
            phases={phases}
            startDate={project.startDate}
            targetGoLiveDate={project.targetGoLiveDate}
            onSelectTask={(task) => setSearch({ task })}
            onTaskDatesChange={project.can.edit ? taskDates : undefined}
            onPhaseDatesChange={project.can.manage ? phaseDates : undefined}
          />
        </CardContent>
      </Card>
      <TaskDetailSheet
        taskId={search.task ?? null}
        project={project}
        onClose={() => setSearch({ task: undefined })}
      />
    </>
  )
}
