import { useMutation, useQuery } from '@apollo/client/react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import type { DeliverableKind, ImplementationTemplateQuery } from '@/graphql/codegen/graphql'
import { StatusBadge } from '@/feature/projects/components/StatusBadge'
import { message } from '@/feature/projects/lib'
import {
  ADD_TEMPLATE_DELIVERABLE,
  ADD_TEMPLATE_PHASE,
  IMPLEMENTATION_TEMPLATE,
  REMOVE_TEMPLATE_DELIVERABLE,
  REMOVE_TEMPLATE_PHASE,
  REORDER_TEMPLATE_PHASES,
  UPDATE_TEMPLATE_PHASE,
} from '@/feature/projects/operations'

type TemplatePhase = ImplementationTemplateQuery['implementationTemplate'][number]

/** Administrators maintain the standard lifecycle; new projects copy it, existing ones do not change. */
export function TemplatePage() {
  const { data, loading, error } = useQuery(IMPLEMENTATION_TEMPLATE, {
    fetchPolicy: 'cache-and-network',
  })
  const refetch = { refetchQueries: [IMPLEMENTATION_TEMPLATE] }
  const [addPhase] = useMutation(ADD_TEMPLATE_PHASE, refetch)
  const [reorder] = useMutation(REORDER_TEMPLATE_PHASES, refetch)
  const [removePhase] = useMutation(REMOVE_TEMPLATE_PHASE, refetch)
  const [newPhase, setNewPhase] = useState('')
  const [removing, setRemoving] = useState<TemplatePhase | null>(null)
  const phases = data?.implementationTemplate ?? []

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      await addPhase({ variables: { input: { name: newPhase } } })
      setNewPhase('')
      toast.success('Phase added to the template')
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const ids = phases.map((p) => p.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorder({ variables: { ids } })
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function confirmRemove(): Promise<string | null> {
    if (!removing) return null
    try {
      await removePhase({ variables: { id: removing.id } })
    } catch (err) {
      return message(err)
    }
    toast.success(`${removing.name} removed from the template`)
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Implementation template</CardTitle>
        <CardDescription>
          The standard lifecycle every new project starts from. Changes apply to projects created
          afterwards only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : loading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ol className="flex flex-col gap-4" aria-label="Template phases">
            {phases.map((phase, index) => (
              <TemplatePhaseEditor
                key={phase.id}
                phase={phase}
                index={index}
                count={phases.length}
                onMove={(delta) => move(index, delta)}
                onRemove={() => setRemoving(phase)}
              />
            ))}
          </ol>
        )}
        <form onSubmit={add} className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="template-new-phase">Add a phase</Label>
          <div className="flex gap-2">
            <Input
              id="template-new-phase"
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value)}
              required
              maxLength={80}
            />
            <Button type="submit">Add</Button>
          </div>
        </form>
      </CardContent>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title={`Remove ${removing?.name ?? 'phase'} from the template?`}
        description="Its suggested deliverables go with it. Existing projects keep their copies."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
      />
    </Card>
  )
}

function TemplatePhaseEditor({
  phase,
  index,
  count,
  onMove,
  onRemove,
}: {
  phase: TemplatePhase
  index: number
  count: number
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}) {
  const refetch = { refetchQueries: [IMPLEMENTATION_TEMPLATE] }
  const [updatePhase, updating] = useMutation(UPDATE_TEMPLATE_PHASE, refetch)
  const [addDeliverable] = useMutation(ADD_TEMPLATE_DELIVERABLE, refetch)
  const [removeDeliverable] = useMutation(REMOVE_TEMPLATE_DELIVERABLE, refetch)
  const [name, setName] = useState(phase.name)
  const [description, setDescription] = useState(phase.description ?? '')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('OUTPUT')
  const dirty = name !== phase.name || description !== (phase.description ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      await updatePhase({
        variables: { input: { id: phase.id, name, description: description || null } },
      })
      toast.success(`${name} saved`)
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      await addDeliverable({
        variables: { input: { templatePhaseId: phase.id, title, kind: kind as DeliverableKind } },
      })
      setTitle('')
    } catch (err) {
      toast.error(message(err))
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          {index + 1}. {phase.name}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${phase.name} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${phase.name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`tpl-name-${phase.id}`}>Name</Label>
          <Input
            id={`tpl-name-${phase.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`tpl-desc-${phase.id}`}>Description</Label>
          <Input
            id={`tpl-desc-${phase.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <Button type="submit" variant="outline" disabled={!dirty || updating.loading}>
          Save
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">Suggested deliverables</p>
        {phase.deliverables.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {phase.deliverables.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{d.title}</span>
                <StatusBadge value={d.kind} />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${d.title}`}
                  onClick={() =>
                    removeDeliverable({ variables: { id: d.id } }).catch((err) =>
                      toast.error(message(err)),
                    )
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label={`New deliverable for ${phase.name}`}
            placeholder="Deliverable title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
          <NativeSelect
            aria-label="Deliverable kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="sm:w-48"
          >
            <option value="OUTPUT">Phase output</option>
            <option value="DATA_CATEGORY">Master-data category</option>
          </NativeSelect>
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
      </div>
    </li>
  )
}
