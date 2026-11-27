import { useMutation } from '@apollo/client/react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { MoveTaskInput, TaskStatus } from '@/graphql/codegen/graphql'
import { message, provisionalPosition, type Neighbours, type TaskData } from '../lib'
import { MOVE_PROJECT_TASK, PROJECT } from '../operations'

export interface MoveOverride {
  status?: TaskStatus
  phaseId?: string
  position?: number
}

export type MoveOverrides = ReadonlyMap<string, MoveOverride>

/** Pure: the task list as the viewer should see it while moves are in flight. */
export function applyMoves<T extends TaskData>(tasks: T[], overrides: MoveOverrides): T[] {
  if (overrides.size === 0) return tasks
  return tasks.map((t) => {
    const o = overrides.get(t.id)
    return o ? { ...t, ...o } : t
  })
}

export interface MoveRequest extends Neighbours {
  id: string
  status?: TaskStatus
  phaseId?: string
}

/**
 * Optimistic drag-and-drop moves (research.md › Decision 5): the item renders in its new place
 * at once; a failed save drops the override and explains why (FR-010). `PROJECT` is refetched
 * and awaited before the override clears, so nothing flickers back.
 */
export function useOptimisticMoves(source: TaskData[]) {
  const [overrides, setOverrides] = useState<Map<string, MoveOverride>>(() => new Map())
  const [mutate] = useMutation(MOVE_PROJECT_TASK, {
    refetchQueries: [PROJECT],
    awaitRefetchQueries: true,
  })
  const tasks = useMemo(() => applyMoves(source, overrides), [source, overrides])

  const move = useCallback(
    async (req: MoveRequest) => {
      const neighbours = { afterTaskId: req.afterTaskId, beforeTaskId: req.beforeTaskId }
      const override: MoveOverride = {
        ...(req.status ? { status: req.status } : {}),
        ...(req.phaseId ? { phaseId: req.phaseId } : {}),
        ...(req.afterTaskId || req.beforeTaskId
          ? { position: provisionalPosition(tasks, neighbours) }
          : {}),
      }
      setOverrides((prev) => new Map(prev).set(req.id, override))
      const input: MoveTaskInput = {
        id: req.id,
        status: req.status ?? null,
        phaseId: req.phaseId ?? null,
        afterTaskId: req.afterTaskId ?? null,
        beforeTaskId: req.beforeTaskId ?? null,
      }
      try {
        await mutate({ variables: { input } })
      } catch (e) {
        toast.error(message(e))
      } finally {
        setOverrides((prev) => {
          const next = new Map(prev)
          next.delete(req.id)
          return next
        })
      }
    },
    [mutate, tasks],
  )

  return { tasks, move, pending: overrides.size > 0 }
}
