import { useState } from 'react'
import { Building2, HeartPulse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ProjectOverview } from './components/ProjectOverview'
import { DataReadiness } from './components/DataReadiness'
import { ProjectTasks } from './components/ProjectTasks'
import { ProjectTimeline } from './components/ProjectTimeline'
import { previewProject } from './fixture'

type PreviewView = 'overview' | 'timeline' | 'tasks' | 'readiness'

const views: { id: PreviewView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'readiness', label: 'Data readiness' },
]

export function ProjectPreviewPage() {
  const [view, setView] = useState<PreviewView>('overview')

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <a
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/preview"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">HIS Planner</span>
              <span className="text-xs text-muted-foreground">Implementation workspace</span>
            </span>
          </a>
          <div className="hidden items-center gap-3 sm:flex">
            <Badge variant="outline">Visual review</Badge>
            <span className="text-sm text-muted-foreground">Sample project</span>
          </div>
          <div
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
            aria-label="Demo project team"
          >
            <Building2 aria-hidden="true" className="size-4" />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline" className="uppercase tracking-wide">
            DEMO PREVIEW · SAMPLE DATA
          </Badge>
          <span className="text-sm text-muted-foreground">Fictional project · no patient data</span>
        </div>
        <PageHeader
          title={previewProject.name}
          description={`${previewProject.implementationName} · Project workspace`}
        />
        <nav aria-label="Project views" className="flex flex-wrap gap-2 border-b pb-3">
          {views.map((item) => (
            <Button
              aria-pressed={view === item.id}
              key={item.id}
              onClick={() => setView(item.id)}
              size="sm"
              type="button"
              variant={view === item.id ? 'default' : 'ghost'}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        {view === 'overview' ? (
          <ProjectOverview />
        ) : view === 'timeline' ? (
          <ProjectTimeline />
        ) : view === 'tasks' ? (
          <ProjectTasks />
        ) : (
          <DataReadiness />
        )}
      </main>
    </div>
  )
}
