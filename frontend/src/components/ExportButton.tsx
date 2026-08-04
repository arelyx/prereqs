// Export menu: download the current plan as CSV or styled XLSX, generated
// entirely client-side (see ../export.ts). Course titles/credits are fetched
// per-subject at export time and cached; if the catalog API is unreachable
// the export still succeeds with code-only rows — the plan itself is local.

import { useEffect, useRef, useState } from 'react'
import type { CourseSummary } from '../api'
import { api } from '../api'
import { ChunkLoadError, downloadCsv, downloadXlsx } from '../export'
import type { CourseInfo } from '../export'
import { useStore } from '../store'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8200'

// subject → code → info, cached for the session (catalog data is static).
const subjectCache = new Map<string, Map<string, CourseInfo>>()

async function fetchSubject(subject: string): Promise<Map<string, CourseInfo>> {
  const cached = subjectCache.get(subject)
  if (cached) return cached
  const out = new Map<string, CourseInfo>()
  // The list endpoint caps limit at 200; page until done (bounded defensively).
  for (let offset = 0, page = 0; page < 5; page++, offset += 200) {
    const res = await fetch(
      `${API_URL}/u/ucsc/courses?subject=${encodeURIComponent(subject)}&limit=200&offset=${offset}`,
    )
    if (!res.ok) throw new Error(`courses fetch failed: ${res.status}`)
    const body: { total: number; courses: CourseSummary[] } = await res.json()
    for (const c of body.courses) out.set(c.code, { title: c.title, credits: c.credits })
    if (out.size >= body.total || body.courses.length === 0) break
  }
  subjectCache.set(subject, out)
  return out
}

/** Best-effort code→title/credits lookup; empty map when offline. */
async function lookupCourses(codes: string[]): Promise<Map<string, CourseInfo>> {
  const subjects = [...new Set(codes.map((c) => c.match(/^[A-Z]+/)?.[0]).filter(Boolean))] as string[]
  const merged = new Map<string, CourseInfo>()
  const results = await Promise.allSettled(subjects.map(fetchSubject))
  for (const r of results) {
    if (r.status === 'fulfilled') for (const [k, v] of r.value) merged.set(k, v)
  }
  return merged
}

export default function ExportButton() {
  const store = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'csv' | 'xlsx' | null>(null)
  // 'chunk' failures need a reload, not a retry — see ChunkLoadError.
  const [error, setError] = useState<'generic' | 'chunk' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function run(format: 'csv' | 'xlsx') {
    if (busy) return
    setBusy(format)
    setError(null)
    try {
      const { content, programIds, planName } = store
      const codes = [...content.completed, ...content.terms.flatMap((t) => t.courses)]
      const courses = await lookupCourses(codes).catch(() => new Map<string, CourseInfo>())

      // Program names: the validation response already carries them; fall
      // back to the programs list, then to bare ids — never block the export.
      const byId = new Map<number, string>()
      for (const p of store.validation?.programs ?? []) byId.set(p.program_id, p.name)
      if (programIds.some((id) => !byId.has(id))) {
        await api
          .programs()
          .then((all) => all.forEach((p) => byId.set(p.id, p.name)))
          .catch(() => {})
      }
      const programNames = programIds.map((id) => byId.get(id) ?? `Program #${id}`)

      const input = { planName, programNames, content, courses }
      if (format === 'csv') downloadCsv(input)
      else await downloadXlsx(input)
      setOpen(false)
    } catch (e) {
      // Log the real cause: the banner is deliberately short, but support
      // needs the underlying network/parse error to diagnose a report.
      console.error('export failed', e)
      setError(e instanceof ChunkLoadError ? 'chunk' : 'generic')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => {
          // The menu unmounts on close, so a lingering `error` would reappear
          // on the next open as a banner about an attempt the user has since
          // forgotten (and that may belong to a different plan). Toggling the
          // menu starts a clean slate; only a real attempt puts it back.
          setError(null)
          setOpen((o) => !o)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Download this plan as a spreadsheet"
        className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>
      {open && (
        <div
          role="menu"
          aria-label="export formats"
          className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-1 shadow-lg"
        >
          <button
            role="menuitem"
            disabled={busy !== null}
            onClick={() => run('csv')}
            className="block w-full px-3 py-1.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
          >
            {busy === 'csv' ? 'Preparing CSV…' : 'Download CSV'}
          </button>
          <button
            role="menuitem"
            disabled={busy !== null}
            onClick={() => run('xlsx')}
            className="block w-full px-3 py-1.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
          >
            {busy === 'xlsx' ? 'Preparing Excel…' : 'Download Excel (.xlsx)'}
          </button>
          {error && (
            <p role="alert" className="px-3 py-1 text-xs text-red-600 dark:text-red-400">
              {error === 'chunk'
                ? 'Export failed — the Excel component could not be loaded. Reload the page, then try again. CSV export still works.'
                : 'Export failed — please try again.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
