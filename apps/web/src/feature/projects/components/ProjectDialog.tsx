import { useMutation } from '@apollo/client/react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProjectStatus } from '@/graphql/codegen/graphql'
import { label, message, PROJECT_STATUSES } from '../lib'
import { CREATE_PROJECT, PROJECT, PROJECT_LIST, UPDATE_PROJECT } from '../operations'

export interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Absent to create. */
  project?: {
    id: string
    name: string
    hospitalName: string
    description: string | null
    status: string
    startDate: string | null
    targetGoLiveDate: string | null
  } | null
  onCreated?: (id: string) => void
}

/** Create a project from the standard template, or edit its details (Managers). */
export function ProjectDialog({ open, onOpenChange, project, onCreated }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [hospitalName, setHospitalName] = useState(project?.hospitalName ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<string>(project?.status ?? 'ACTIVE')
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [targetGoLiveDate, setTargetGoLiveDate] = useState(project?.targetGoLiveDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [createProject, created] = useMutation(CREATE_PROJECT, { refetchQueries: [PROJECT_LIST] })
  const [updateProject, updated] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [PROJECT, PROJECT_LIST],
  })
  const busy = created.loading || updated.loading

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (startDate && targetGoLiveDate && targetGoLiveDate < startDate) {
      setError('Target go-live must not be before the start date')
      return
    }
    try {
      if (project) {
        await updateProject({
          variables: {
            input: {
              id: project.id,
              name,
              hospitalName,
              description: description || null,
              status: status as ProjectStatus,
              startDate: startDate || null,
              targetGoLiveDate: targetGoLiveDate || null,
            },
          },
        })
        toast.success(`${name} saved`)
        onOpenChange(false)
      } else {
        const { data } = await createProject({
          variables: {
            input: {
              name,
              hospitalName,
              description: description || null,
              startDate: startDate || null,
              targetGoLiveDate: targetGoLiveDate || null,
            },
          },
        })
        toast.success(`${name} created from the standard template`)
        onOpenChange(false)
        if (data) onCreated?.(data.createProject.id)
      }
    } catch (err) {
      setError(message(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{project ? 'Edit project' : 'New implementation project'}</DialogTitle>
            <DialogDescription>
              {project
                ? 'Change the project record. Phases and tasks are edited on the project pages.'
                : 'Starts from the standard nine-phase lifecycle; tailor it afterwards. This planner coordinates the implementation and holds no patient records.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-hospital">Hospital / client</Label>
            <Input
              id="project-hospital"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-golive">Target go-live</Label>
              <Input
                id="project-golive"
                type="date"
                value={targetGoLiveDate}
                onChange={(e) => setTargetGoLiveDate(e.target.value)}
              />
            </div>
          </div>
          {project ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-status">Status</Label>
              <NativeSelect
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : project ? 'Save' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
