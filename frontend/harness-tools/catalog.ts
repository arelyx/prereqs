// Node-side catalog: reads the committed course files directly, so tests and
// the eval adapter see exactly the facts the browser gets from the API.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { makeCatalog } from '@harness'
import type { Catalog, RawCourse } from '@harness'

export const REPO = fileURLToPath(new URL('../..', import.meta.url))
const COURSES = join(REPO, 'data-committed/ucsc/courses')

let cached: Catalog | null = null

/** The full catalog with every description loaded. */
export function loadCatalog(): Catalog {
  if (cached) return cached
  const rows: RawCourse[] = []
  const subjects: string[] = []
  for (const f of readdirSync(COURSES).sort()) {
    if (!f.endsWith('.json')) continue
    const doc = JSON.parse(readFileSync(join(COURSES, f), 'utf8'))
    subjects.push(doc.subject)
    for (const c of doc.courses) rows.push(c)
  }
  cached = makeCatalog(rows, subjects)
  return cached
}

export function sourceText(edition: string, slug: string): string {
  return readFileSync(join(REPO, 'data-committed/ucsc/editions', edition, 'sources', `${slug}.md`), 'utf8')
}

export function programIndex(edition: string): { slug: string; source_sha256: string; skeleton_sha256: string; name: string }[] {
  return JSON.parse(readFileSync(join(REPO, 'data-committed/ucsc/editions', edition, 'programs.json'), 'utf8'))
}
