// One program's degree dashboard: loads the harness module (and its bespoke
// View, if any) for the plan's edition, fetches catalog facts, and evaluates
// the plan CLIENT-SIDE on every edit — no backend round trip.
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import type { ProgramSummary } from '../../api'
import { fetchCatalog } from '../../harness/catalogClient'
import type { HarnessEntry, ViewProps } from '../../harness/registry'
import type { Harness } from '../../harness/run'
import { runHarness } from '../../harness/run'
import type { Catalog, StudentRecord } from '../../harness/types'
import { useStore } from '../../store'
import { currentTermCode } from '../../terms'
import DefaultReport, { Summary } from './DefaultReport'
import { Card, StatusPill } from './ui'

const OPEN_KEY = 'prereqs.dashOpen'

function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function ProgramDashboard({
  program,
  entry,
  onOpenCourse,
}: {
  program: ProgramSummary
  entry: HarnessEntry
  onOpenCourse: (code: string) => void
}) {
  const store = useStore()
  const [harness, setHarness] = useState<Harness | null>(null)
  const [View, setView] = useState<ComponentType<ViewProps> | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(() => readOpen()[program.slug] ?? true)

  useEffect(() => {
    let live = true
    entry
      .load()
      .then(async (h) => {
        const [cat, view] = await Promise.all([
          fetchCatalog(h.catalogNeeds?.descriptions ?? []),
          entry.loadView ? entry.loadView() : Promise.resolve(null),
        ])
        if (!live) return
        setHarness(h)
        setCatalog(cat)
        setView(() => view)
      })
      .catch((e) => live && setError(String(e?.message ?? e)))
    return () => {
      live = false
    }
  }, [entry])

  const slug = program.slug
  const content = store.content
  const student: StudentRecord = useMemo(
    () => ({
      terms: content.terms.map((t) => ({ term: t.term_code, courses: t.courses })),
      completed: content.completed,
      grades: content.grades ?? {},
      choices: content.choices?.[slug] ?? {},
      attested: content.attested?.[slug] ?? [],
      currentTerm: currentTermCode(),
    }),
    [content, slug],
  )
  const result = useMemo(() => {
    if (!harness || !catalog) return null
    try {
      return { report: runHarness(harness, student, catalog), error: null }
    } catch (e) {
      return { report: null, error: String((e as Error).message ?? e) }
    }
  }, [harness, catalog, student])

  const setChoice = (key: string, value: string | null) => store.setChoice(slug, key, value)
  const setAttested = (id: string, on: boolean) => {
    const cur = content.attested?.[slug] ?? []
    store.setAttested(slug, on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id))
  }
  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify({ ...readOpen(), [slug]: next }))
    } catch {
      /* storage unavailable */
    }
  }

  const report = result?.report ?? null
  const Body = View ?? DefaultReport
  const verified = entry.manifest.status === 'verified'
  return (
    <section aria-label={`${program.name} degree progress`} className="space-y-3">
      <Card className="px-4 py-3">
        <button className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left" onClick={toggle} aria-expanded={open}>
          <span className="text-zinc-400">{open ? '▾' : '▸'}</span>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{program.name}</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{program.edition} catalog</span>
          {report && <StatusPill status={report.status} label={report.status === 'met' ? 'Complete' : report.status === 'in-progress' ? 'On track (planned)' : undefined} />}
          <span
            className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium ${
              verified
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
            title={
              verified
                ? `Requirement logic checked line by line against the ${program.edition} catalog page.`
                : 'Requirement logic not yet verified against the catalog page.'
            }
          >
            {verified ? 'checked against catalog' : 'draft'}
          </span>
        </button>
        {report && (
          <div className="mt-3">
            <Summary report={report} />
          </div>
        )}
        {open && report && report.notes.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {report.notes.map((n, i) => (
              <li key={i}>ⓘ {n}</li>
            ))}
          </ul>
        )}
        {(error || result?.error) && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">Couldn’t evaluate this program: {error ?? result?.error}</p>
        )}
        {!report && !error && !result?.error && <p className="mt-2 text-xs text-zinc-400">loading requirements…</p>}
      </Card>
      {open && report && harness && (
        <Body report={report} harness={harness} onOpenCourse={onOpenCourse} setChoice={setChoice} setAttested={setAttested} />
      )}
      {open && report && (
        <p className="text-[11px] text-zinc-400">
          Computed from the {program.edition} catalog text in your browser. “Check yourself” items can’t be verified from course
          data — confirm them with your advisor.
        </p>
      )}
    </section>
  )
}
