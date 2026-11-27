import { createContext, useContext } from 'react'
import type { ProjectData } from '../lib'

export interface ProjectContextValue {
  project: ProjectData
  refetch: () => Promise<unknown>
}

export const ProjectContext = createContext<ProjectContextValue | null>(null)

/** The project the current tab belongs to; provided by `ProjectLayout`. */
export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext)
  if (!value) throw new Error('useProject must be used inside ProjectLayout')
  return value
}
