import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import {
  label,
  phasesInOrder,
  TASK_STATUSES,
  WORK_SORTS,
  workSortOf,
  type ProjectData,
  type WorkSort,
} from '../lib'
import { SearchBox } from '../components/SearchBox'
import { useReadability } from '../readability'
import { useWorkSearch } from './work-search'

export interface WorkFiltersProps {
  project: ProjectData
  /** The List offers a sort; the Board and Timeline keep manual order. */
  withSort?: boolean
  /** Feature 011 FR-002: completed tasks the view is hiding, shown on the toggle. */
  hiddenDone?: number
  /** Feature 011 FR-016: the Board offers lanes by phase. */
  withLayout?: boolean
}

/** FR-004: one filter bar, read from and written to the shared route search. */
export function WorkFilters({
  project,
  withSort = false,
  hiddenDone = 0,
  withLayout = false,
}: WorkFiltersProps) {
  const { search, setSearch } = useWorkSearch()
  const { showDone, setShowDone, layout, setLayout } = useReadability()
  const phases = phasesInOrder(project.phases)
  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Filter work">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          className="min-w-56 flex-1"
          value={search.q ?? ''}
          onChange={(q) => setSearch({ q: q || undefined })}
        />
        <Button
          type="button"
          size="sm"
          variant={search.mine ? 'secondary' : 'outline'}
          aria-pressed={search.mine === true}
          onClick={() => setSearch({ mine: search.mine ? undefined : true })}
        >
          Mine
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showDone ? 'secondary' : 'outline'}
          aria-pressed={showDone}
          onClick={() => setShowDone(!showDone)}
        >
          {showDone ? 'Hide done' : hiddenDone ? `Show done (${hiddenDone})` : 'Show done'}
        </Button>
        {withLayout ? (
          <Button
            type="button"
            size="sm"
            variant={layout === 'lanes' ? 'secondary' : 'outline'}
            aria-pressed={layout === 'lanes'}
            onClick={() => setLayout(layout === 'lanes' ? 'columns' : 'lanes')}
          >
            Lanes by phase
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-phase">Phase</Label>
          <NativeSelect
            id="filter-phase"
            value={search.phase ?? ''}
            onChange={(e) => setSearch({ phase: Number(e.target.value) || undefined })}
          >
            <option value="">All phases</option>
            {phases.map((p, i) => (
              <option key={p.id} value={i + 1}>
                {i + 1}. {p.name}
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
    </div>
  )
}

type WorkFiltersStatus = ProjectData['phases'][number]['tasks'][number]['status'] | undefined
