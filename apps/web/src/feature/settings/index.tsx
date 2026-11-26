import { useRouteContext } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ChangePasswordCard } from './account'

export function SettingsPage() {
  const { current } = useCurrentUser()
  const { access } = useRouteContext({ from: '/_protected' })
  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Name: </span>
            {current?.user.name}
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {current?.user.email}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Role:</span>{' '}
            <Badge variant="secondary">{access?.role.name ?? '—'}</Badge>
          </div>
        </CardContent>
      </Card>
      <ChangePasswordCard />
    </>
  )
}
