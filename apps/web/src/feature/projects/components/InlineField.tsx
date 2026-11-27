import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type InlineFieldKind = 'text' | 'textarea' | 'date' | 'select'

export interface InlineFieldProps {
  id: string
  label: string
  kind: InlineFieldKind
  value: string
  /** For `select`: the choices; an empty value is allowed when `emptyLabel` is given. */
  options?: ReadonlyArray<{ value: string; label: string }>
  emptyLabel?: string
  disabled?: boolean
  maxLength?: number
  /** Called with the new value once it is committed (change for select/date, blur or Enter for text). */
  onCommit: (value: string) => void | Promise<void>
}

/** A labelled field that saves in place: no form, no save button (US5 scenario 2). */
export function InlineField({
  id,
  label,
  kind,
  value,
  options = [],
  emptyLabel,
  disabled = false,
  maxLength,
  onCommit,
}: InlineFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const current = draft ?? value
  const commitDraft = () => {
    if (draft !== null && draft !== value) void onCommit(draft)
    setDraft(null)
  }
  const control =
    kind === 'select' ? (
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => void onCommit(e.target.value)}
      >
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    ) : kind === 'date' ? (
      <Input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => void onCommit(e.target.value)}
      />
    ) : kind === 'textarea' ? (
      <Textarea
        id={id}
        value={current}
        disabled={disabled}
        rows={3}
        maxLength={maxLength}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDraft(null)
        }}
      />
    ) : (
      <Input
        id={id}
        value={current}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setDraft(null)
        }}
      />
    )
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {control}
    </div>
  )
}
