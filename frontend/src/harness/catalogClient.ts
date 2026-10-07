// Fetches the compact catalog once per set of described subjects and builds
// the Catalog harnesses evaluate against (in-memory cache for the session).
import { makeCatalog } from './courses'
import type { RawCourse } from './courses'
import type { Catalog } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8200'
const cache = new Map<string, Promise<Catalog>>()

export function fetchCatalog(describe: string[] = []): Promise<Catalog> {
  const subjects = [...new Set(describe.map((s) => s.toUpperCase()))].sort()
  const k = subjects.join(',')
  let p = cache.get(k)
  if (!p) {
    p = fetch(`${API_URL}/u/ucsc/catalog/compact?describe=${encodeURIComponent(k)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`catalog ${r.status}`)
        return r.json() as Promise<{ described: string[]; courses: RawCourse[] }>
      })
      .then((d) => makeCatalog(d.courses, d.described))
    p.catch(() => cache.delete(k))
    cache.set(k, p)
  }
  return p
}
