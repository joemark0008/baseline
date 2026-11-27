import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import {
  label,
  TASK_STATUSES,
  WORK_SORTS,
  workSortOf,
  type ProjectData,
  type WorkSort,
} from '../lib'
import { useWorkSearch } from './work-search'

export interface WorkFiltersProps {
  project: ProjectData
  /** The List offers a sort; the Board and Timeline keep manual order. */
  withSort?: boolean
}

/** FR-004: one filter bar, read from and written to the shared route search. */
export function WorkFilters({ project, withSort = false }: WorkFiltersProps) {
  const { search, setSearch } = useWorkSearch()
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" role="group" aria-label="Filter work">
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-phase">Phase</Label>
        <NativeSelect
          id="filter-phase"
          value={search.phase ?? ''}
          onChange={(e) => setSearch({ phase: e.target.value || undefined })}
        >
          <option value="">All phases</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-owner">Owner</Label>
        <NativeSelect
          id="filter-owner"
          value={search.owner ?? ''}
          onChange={(e) => setSearch({ owner: e.target.value || undefined })}
        >
          <option value="">Anyone</option>
          {project.members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-status">Status</Label>
        <NativeSelect
          id="filter-status"
          value={search.status ?? ''}
          onChange={(e) =>
            setSearch({ status: (e.target.value || undefined) as WorkFiltersStatus })
          }
        >
          <option value="">Any status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {withSort ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-sort">Sort</Label>
          <NativeSelect
            id="filter-sort"
            value={workSortOf(search)}
            onChange={(e) => setSearch({ sort: e.target.value as WorkSort })}
          >
            {WORK_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <Checkbox
          checked={search.overdue === true}
          onCheckedChange={(c) => setSearch({ overdue: c === true ? true : undefined })}
          aria-label="Overdue only"
        />
        Overdue only
      </label>
    </div>
  )
}

type WorkFiltersStatus = ProjectData['phases'][number]['tasks'][number]['status'] | undefined
