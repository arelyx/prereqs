// Browser registry of harness modules. Vite globs ../harnesses at build time,
// so a new harnesses/ucsc/<edition>/<slug>/ directory is picked up without
// touching app code. Modules (and bespoke Views) load lazily per program.
import type { ComponentType } from 'react'
import type { Harness } from './run'
import type { ProgressReport } from './types'

export interface Manifest {
  program: string
  edition: string
  approach: string
  source_sha256: string
  skeleton_sha256: string
  status: 'draft' | 'verified'
  authored_at: string
  verified_at: string | null
  notes: string
}

export interface ViewProps {
  report: ProgressReport
  harness: Harness
  onOpenCourse: (code: string) => void
  setChoice: (key: string, value: string | null) => void
  setAttested: (id: string, on: boolean) => void
}

const modules = import.meta.glob<{ default: Harness }>('../../../harnesses/ucsc/*/*/harness.ts')
const views = import.meta.glob<{ default: ComponentType<ViewProps> }>('../../../harnesses/ucsc/*/*/View.tsx')
const manifests = import.meta.glob<Manifest>('../../../harnesses/ucsc/*/*/manifest.json', { eager: true, import: 'default' })

const key = (path: string) => {
  const m = path.match(/harnesses\/ucsc\/([^/]+)\/([^/]+)\//)
  return m ? `${m[1]}/${m[2]}` : path
}
const byKey = <T,>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).map(([p, v]) => [key(p), v]))
const MODULES = byKey(modules)
const VIEWS = byKey(views)
const MANIFESTS = byKey(manifests)

export interface HarnessEntry {
  manifest: Manifest
  load: () => Promise<Harness>
  loadView: (() => Promise<ComponentType<ViewProps>>) | null
}

export function findHarness(edition: string, slug: string): HarnessEntry | null {
  const k = `${edition}/${slug}`
  const mod = MODULES[k]
  const manifest = MANIFESTS[k]
  if (!mod || !manifest) return null
  return {
    manifest,
    load: () => mod().then((m) => m.default),
    loadView: VIEWS[k] ? () => VIEWS[k]().then((m) => m.default) : null,
  }
}

export function listHarnesses(): Manifest[] {
  return Object.values(MANIFESTS)
}
