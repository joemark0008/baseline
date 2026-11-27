import { MockedProvider } from '@apollo/client/testing/react'
import type { MockedResponse } from '@apollo/client/testing'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { TaskData } from '../lib'
import { MOVE_PROJECT_TASK } from '../operations'
import { applyMoves, useOptimisticMoves } from './use-optimistic-moves'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const task = (id: string, position: number, over: Partial<TaskData> = {}): TaskData => ({
  id,
  projectId: 'p1',
  phaseId: 'ph1',
  title: id,
  description: null,
  owner: null,
  status: 'UPCOMING',
  priority: 'MEDIUM',
  startDate: null,
  dueDate: null,
  overdue: false,
  predecessor: null,
  position,
  predecessorConflict: false,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...over,
})
const source = [task('a', 1), task('b', 2), task('c', 3)]

describe('applyMoves', () => {
  it('overlays pending moves and leaves the rest untouched', () => {
    const out = applyMoves(
      source,
      new Map([['b', { status: 'IN_PROGRESS' as const, position: 0.5 }]]),
    )
    expect(out[1]).toMatchObject({ id: 'b', status: 'IN_PROGRESS', position: 0.5 })
    expect(out[0]).toBe(source[0])
    expect(applyMoves(source, new Map())).toBe(source)
  })
})

describe('useOptimisticMoves', () => {
  const wrapper =
    (mocks: MockedResponse[]) =>
    ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={mocks}>{children}</MockedProvider>
    )
  const variables = {
    input: { id: 'c', status: 'IN_PROGRESS', phaseId: null, afterTaskId: null, beforeTaskId: 'a' },
  }

  it('shows the move at once and keeps it after the server agrees', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: MOVE_PROJECT_TASK, variables },
        result: {
          data: {
            moveProjectTask: { id: 'c', phaseId: 'ph1', status: 'IN_PROGRESS', position: 0 },
          },
        },
      },
    ]
    const { result } = renderHook(() => useOptimisticMoves(source), { wrapper: wrapper(mocks) })
    let done: Promise<void>
    act(() => {
      done = result.current.move({ id: 'c', status: 'IN_PROGRESS', beforeTaskId: 'a' })
    })
    expect(result.current.tasks[2]).toMatchObject({ id: 'c', status: 'IN_PROGRESS', position: 0 })
    expect(result.current.pending).toBe(true)
    await act(async () => {
      await done
    })
    await waitFor(() => expect(result.current.pending).toBe(false))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('rolls back and explains when the server refuses', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: MOVE_PROJECT_TASK, variables },
        error: new Error('Task not found in this project'),
      },
    ]
    const { result } = renderHook(() => useOptimisticMoves(source), { wrapper: wrapper(mocks) })
    await act(async () => {
      await result.current.move({ id: 'c', status: 'IN_PROGRESS', beforeTaskId: 'a' })
    })
    expect(result.current.tasks[2]).toMatchObject({ id: 'c', status: 'UPCOMING', position: 3 })
    expect(result.current.pending).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Task not found in this project')
  })
})
