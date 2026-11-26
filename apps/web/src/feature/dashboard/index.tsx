import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const STEPS = [
  ['/speckit-specify <what you want>', 'describe the feature'],
  ['/speckit-plan', 'design it'],
  ['/speckit-tasks', 'break it into tasks'],
  ['/speckit-implement', 'build it'],
] as const

/** Placeholder home screen: replace it with the first feature from your spec. */
export function DashboardPage() {
  const { current } = useCurrentUser()
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome${current ? `, ${current.user.name}` : ''}.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>Start your first feature</CardTitle>
          <CardDescription>
            This screen is a placeholder. Replace it with the first feature from your spec.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2 text-sm">
            {STEPS.map(([command, purpose], i) => (
              <li key={command} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-muted-foreground">{i + 1}.</span>
                <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{command}</code>
                <span className="text-muted-foreground">{purpose}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </>
  )
}
