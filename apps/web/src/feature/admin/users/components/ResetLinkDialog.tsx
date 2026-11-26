import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export interface ResetLink {
  name: string
  url: string
  expiresAt: unknown
  /** Whether the email provider accepted the reset email (feature 008). */
  emailSent: boolean
}

/** Shows a freshly created reset link in a modal. It's the only time the link can be seen. */
export function ResetLinkDialog({ link, onClose }: { link: ResetLink; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password reset link for {link.name}</DialogTitle>
          <DialogDescription>
            {link.emailSent
              ? `We emailed this link to ${link.name}. `
              : `Send it to ${link.name} yourself. `}
            Works once, until {new Date(link.expiresAt as string).toLocaleString()}. It won't be
            shown again; if it's lost, create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Reset link"
            value={link.url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <Button type="button" onClick={copy} className="shrink-0">
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
