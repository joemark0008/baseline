import { NativeSelect } from '@/components/ui/select'
import type { Person } from '../lib'

export interface PersonSelectProps extends Omit<
  React.ComponentProps<'select'>,
  'value' | 'onChange'
> {
  people: ReadonlyArray<Person>
  value: string
  onChange: (id: string) => void
  emptyLabel?: string
}

/** A member picker; the empty option means "nobody". */
export function PersonSelect({
  people,
  value,
  onChange,
  emptyLabel = 'Unassigned',
  ...props
}: PersonSelectProps) {
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      <option value="">{emptyLabel}</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </NativeSelect>
  )
}
