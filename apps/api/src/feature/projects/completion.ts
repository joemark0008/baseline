/**
 * Feature 011 (data-model.md › ProjectTask.completedAt): the write that keeps `completedAt`
 * in step with the status. Only a crossing of the COMPLETE boundary writes anything.
 */
export function completionStamp(
  previous: string | null,
  next: string,
  now: Date = new Date(),
): { completedAt?: Date | null } {
  const wasComplete = previous === 'COMPLETE'
  const isComplete = next === 'COMPLETE'
  if (isComplete && !wasComplete) return { completedAt: now }
  if (wasComplete && !isComplete) return { completedAt: null }
  return {}
}
