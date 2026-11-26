import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { rateLimitMessage } from '@/lib/rate-limit'

/** Shown instead of "invalid link" or "invalid credentials" when the API refused for rate limiting. */
export function RateLimitAlert({ seconds }: { seconds: number }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Too many attempts</AlertTitle>
      <AlertDescription>{rateLimitMessage(seconds)}</AlertDescription>
    </Alert>
  )
}
