import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Gantt } from '../components/Gantt'
import { useProject } from './context'

/** FR-007: phases, tasks, date ranges, status and dependencies on one scrollable chart. */
export function ProjectTimelineTab() {
  const { project } = useProject()
  const navigate = useNavigate()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Implementation timeline</CardTitle>
        <CardDescription>
          Phase schedule with task due dates and dependencies. Select a task to open it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Gantt
          phases={project.phases}
          startDate={project.startDate}
          targetGoLiveDate={project.targetGoLiveDate}
          onSelectTask={(task) =>
            navigate({ to: '/projects/$id/tasks', params: { id: project.id }, search: { task } })
          }
        />
      </CardContent>
    </Card>
  )
}
