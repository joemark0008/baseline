import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useShortcut } from './use-shortcut'

export interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  /** Idle time before a keystroke reaches `onChange` (the URL), in ms. */
  delay?: number
  className?: string
}

/**
 * Feature 011 FR-006/FR-010: the task search. Echoes immediately, writes after a short pause,
 * clears on Escape or the clear button, and `/` focuses it from anywhere on the page.
 */
export function SearchBox({ value, onChange, delay = 150, className }: SearchBoxProps) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    // The URL changed under us (view switch, Clear filters): follow it.
    setSynced(value)
    setText(value)
  }
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useShortcut('/', () => input.current?.focus())

  const commit = (next: string) => {
    window.clearTimeout(timer.current)
    onChange(next)
  }
  const type = (next: string) => {
    setText(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(next), delay)
  }
  const clear = () => {
    setText('')
    commit('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      clear()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(text)
    }
  }

  return (
    <div className={`relative flex items-center ${className ?? ''}`}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
      />
      <Input
        ref={input}
        type="search"
        aria-label="Search tasks"
        placeholder="Search tasks  /"
        value={text}
        maxLength={100}
        className="pl-8 pr-8"
        onChange={(e) => type(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {text ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1 size-7"
          aria-label="Clear search"
          onClick={clear}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
