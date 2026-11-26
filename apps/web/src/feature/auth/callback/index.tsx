import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getSession } from '@/lib/auth-client'

const MAX_ATTEMPTS = 6
const DELAY_MS = 250

/** Every sign-in lands here. A social callback can return before the cookie is readable, so poll. */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    ;(async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        const session = await getSession()
        if (session) {
          await navigate({ to: '/dashboard', replace: true })
          return
        }
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
      if (!cancelled) await navigate({ to: '/login', replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <Card>
      <CardContent role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Signing you in…
      </CardContent>
    </Card>
  )
}
