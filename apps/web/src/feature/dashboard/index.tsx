import { Link, useRouteContext } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { can } from '@/lib/access'

/** Home: a short orientation and the way into the implementation projects. */
export function DashboardPage() {
  const { current } = useCurrentUser()
  const { access } = useRouteContext({ from: '/_protected' })
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome${current ? `, ${current.user.name}` : ''}.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>HIS implementation projects</CardTitle>
          <CardDescription>
            Plan a hospital information system rollout phase by phase: tasks, timeline,
            deliverables, data readiness, stakeholders and the people doing the work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {can(access, 'projects', 'view') ? (
            <Button asChild>
              <Link to="/projects">Open projects</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask an administrator for access to Projects to see the implementations you belong to.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
