import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Shown for any URL that matches no page, with a way back to the start. */
export function NotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Page not found</h1>
        </CardTitle>
        <CardDescription>The address may be mistyped, or the page may have moved.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/">Go to the start</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
