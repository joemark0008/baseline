import { useMutation } from '@apollo/client/react'
import { Plus } from 'lucide-react'
import { useState, type FormEvent, type Ref } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { message } from '../lib'
import { CREATE_PROJECT_TASK, PROJECT } from '../operations'

export interface QuickAddRowProps {
  projectId: string
  phaseId: string
  phaseName: string
  /** Lets the `n` shortcut focus the first visible row. */
  inputRef?: Ref<HTMLInputElement>
}

/** US2 scenario 2: type a title, press Enter, and the task joins the end of this phase. */
export function QuickAddRow({ projectId, phaseId, phaseName, inputRef }: QuickAddRowProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [create, { loading }] = useMutation(CREATE_PROJECT_TASK, { refetchQueries: [PROJECT] })

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || loading) return
    setError(null)
    try {
      await create({ variables: { input: { projectId, phaseId, title: trimmed } } })
      setTitle('')
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-1"
      aria-label={`Quick add to ${phaseName}`}
    >
      <div className="flex items-center gap-2">
        <Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
          }}
          placeholder="Add a task and press Enter"
          aria-label={`Add a task to ${phaseName}`}
          maxLength={160}
          className="h-8"
        />
        <Button type="submit" size="sm" variant="ghost" disabled={loading || !title.trim()}>
          Add
        </Button>
      </div>
      {error ? (
        <p role="alert" className="pl-6 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
