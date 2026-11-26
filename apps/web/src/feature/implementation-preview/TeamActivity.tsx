import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { previewProject } from './project-fixture'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(date),
  )
}

export function TeamActivity() {
  const team = new Map(previewProject.team.map((member) => [member.id, member]))

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card role="region" aria-label="Project team">
        <CardHeader>
          <h2 className="font-semibold">Project team</h2>
          <CardDescription>Hospital and HISD3 implementation leads</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {previewProject.team.map((member) => (
              <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={member.id}>
                <Avatar aria-label={member.name}>
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                </div>
                <Badge variant="outline">{member.organization}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card role="region" aria-label="Recent activity">
        <CardHeader>
          <h2 className="font-semibold">Recent activity</h2>
          <CardDescription>Latest updates from this sample project</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col divide-y">
            {previewProject.activity.map((item) => {
              const actor = team.get(item.actorId)
              return (
                <li className="flex gap-3 py-3 first:pt-0 last:pb-0" key={item.id}>
                  <Avatar aria-label={actor?.name ?? 'Project member'} size="sm">
                    <AvatarFallback>{actor?.initials ?? 'PM'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{actor?.name ?? 'Project member'}</span>{' '}
                      <span className="text-muted-foreground">{item.action}</span>{' '}
                      <span className="font-medium">{item.target}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
