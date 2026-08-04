// Transcript import: upload a PDF transcript, review the LLM-extracted
// courses, confirm to build a NEW plan from them — each course placed in the
// quarter it was actually taken.
//
// Importing never edits the plan you are looking at. A transcript is a record
// of the past, and merging it into a plan someone has been hand-building is
// destructive and hard to undo; a new plan is cheap and switchable.
//
// The feature is LLM-gated: /transcript/status decides whether the button is
// usable at all (no local heuristic fallback — unavailable means disabled,
// with a clear message). The file is parsed server-side in memory only.

import { useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError, displayCode } from '../api'
import type { PlanContent, TranscriptParseResult, TranscriptRow, TranscriptStatus } from '../api'
import { useStore } from '../store'
import { academicYearOf, ayTermCodes, termCodeFromLabel } from '../terms'

const MAX_BYTES = 10 * 1024 * 1024
// Backend caps on plan content.
const MAX_TERMS = 24
const MAX_COMPLETED = 200

/** Lay the selected rows out as a plan: one entry per quarter they were taken
 * in. Rows whose term heading we can't read fall back to the completed list
 * rather than being dropped. */
function buildPlanContent(rows: TranscriptRow[]): PlanContent {
  const byTerm = new Map<string, string[]>()
  const completed: string[] = []
  for (const row of rows) {
    const termCode = termCodeFromLabel(row.term)
    if (!termCode) {
      if (!completed.includes(row.code)) completed.push(row.code)
      continue
    }
    const courses = byTerm.get(termCode) ?? []
    if (!courses.includes(row.code)) courses.push(row.code)
    byTerm.set(termCode, courses)
  }

  // Fill in the rest of every academic year the transcript touches, so the
  // planner draws whole rows instead of one lonely quarter per year.
  for (const year of new Set([...byTerm.keys()].map(academicYearOf))) {
    for (const code of ayTermCodes(year)) if (!byTerm.has(code)) byTerm.set(code, [])
  }

  const byCode = (a: { term_code: string }, b: { term_code: string }) =>
    Number(a.term_code) - Number(b.term_code)
  let terms = [...byTerm.entries()]
    .map(([term_code, courses]) => ({ term_code, courses }))
    .sort(byCode)
  if (terms.length > MAX_TERMS) {
    // Over the cap, quarters holding courses outrank the cosmetic filler.
    const real = terms.filter((t) => t.courses.length).slice(0, MAX_TERMS)
    const filler = terms.filter((t) => !t.courses.length)
    terms = [...real, ...filler.slice(0, MAX_TERMS - real.length)].sort(byCode)
  }
  return { completed: completed.slice(0, MAX_COMPLETED), terms }
}

type Phase =
  | { kind: 'pick'; error?: string }
  | { kind: 'busy' }
  | { kind: 'review'; result: TranscriptParseResult; error?: string }

function flagLabel(grade: string): string {
  if (!grade) return 'in progress — no grade yet'
  return `not completed — grade ${grade}`
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white dark:bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default function TranscriptImport() {
  const store = useStore()
  const [status, setStatus] = useState<TranscriptStatus | null>(null)
  const [statusKnown, setStatusKnown] = useState(false)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .transcriptStatus()
      .then(setStatus)
      .catch(() => setStatus({ available: false, model: null }))
      .finally(() => setStatusKnown(true))
  }, [])

  const available = status?.available === true

  async function pickFile(file: File) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setPhase({ kind: 'pick', error: 'Only PDF files are supported.' })
      return
    }
    if (file.size > MAX_BYTES) {
      setPhase({ kind: 'pick', error: 'File is too large (max 10 MB).' })
      return
    }
    setPhase({ kind: 'busy' })
    try {
      const result = await api.parseTranscript(file)
      setSelected(new Set(result.matched.flatMap((r, i) => (r.completed ? [i] : []))))
      setPhase({ kind: 'review', result })
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 503
            ? 'Transcript import is unavailable right now — the language-model service is not reachable.'
            : e.message
          : 'network error'
      setPhase({ kind: 'pick', error: msg })
    }
  }

  const selectedRows = useMemo(() => {
    if (phase.kind !== 'review') return []
    return [...selected].sort((a, b) => a - b).map((i) => phase.result.matched[i])
  }, [phase, selected])

  function apply() {
    if (phase.kind !== 'review') return
    const id = store.createPlan('Imported transcript', buildPlanContent(selectedRows))
    if (id === null) {
      setPhase({
        kind: 'review',
        result: phase.result,
        error: `You already have ${store.plans.length} plans, the maximum. Delete one and import again.`,
      })
      return
    }
    close() // createPlan already made the new plan active
  }

  function close() {
    setOpen(false)
    setPhase({ kind: 'pick' })
    setSelected(new Set())
  }

  if (!statusKnown) return null
  if (!available) {
    return (
      <button
        disabled
        title="Transcript import needs the local language-model service, which is not available on this server."
        className="cursor-not-allowed rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-xs text-zinc-400 dark:text-zinc-600"
      >
        Import transcript (unavailable)
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-700 dark:hover:text-sky-300"
      >
        Import transcript
      </button>

      {open && (
        <Modal onClose={phase.kind === 'busy' ? () => {} : close}>
          <h2 className="mb-1 text-lg font-bold">Import transcript</h2>

          {phase.kind === 'pick' && (
            <div>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                Upload your unofficial transcript (PDF, max 10 MB). It is processed in
                memory and never stored. Your courses land in a new plan, each in the
                quarter you took it — nothing here changes your current plan.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                aria-label="transcript PDF"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void pickFile(f)
                }}
                className="w-full rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-sky-500"
              />
              {phase.error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{phase.error}</p>
              )}
              <button
                className="mt-3 w-full text-center text-xs text-zinc-500 dark:text-zinc-400 hover:underline"
                onClick={close}
              >
                Cancel
              </button>
            </div>
          )}

          {phase.kind === 'busy' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-sky-600" />
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Extracting your courses…</p>
              <p className="text-xs text-zinc-400">
                This takes about a minute — a local language model reads the whole transcript.
              </p>
            </div>
          )}

          {phase.kind === 'review' && (
            <>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Best guess from your transcript — uncheck anything that's wrong, then
                confirm. This creates a <strong>new plan</strong> with each course in the
                quarter you took it; your current plan is left alone.
              </p>
              {phase.result.warnings.map((w, i) => (
                <p key={i} className="mb-1 rounded border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950 px-2 py-1 text-xs text-amber-800 dark:text-amber-300">
                  {w}
                </p>
              ))}
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                {phase.result.matched.map((row, i) => (
                  <li
                    key={`${row.code}-${row.term}`}
                    className={`rounded-md border p-2 ${
                      row.completed
                        ? 'border-zinc-200 dark:border-zinc-800'
                        : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40'
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(i)
                          else next.delete(i)
                          setSelected(next)
                        }}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{displayCode(row.code)}</span>
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{row.title}</span>
                        <span className="block text-[11px] text-zinc-400">
                          {row.term}
                          {row.grade ? ` · grade ${row.grade}` : ''}
                        </span>
                        {!row.completed && (
                          <span className="block text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            {flagLabel(row.grade)}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
                {phase.result.unmatched.map((raw) => (
                  <li
                    key={raw}
                    className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-2"
                  >
                    <span className="text-sm text-zinc-400 line-through decoration-transparent">{raw}</span>
                    <span className="ml-2 text-[11px] text-zinc-400">
                      not recognized in the catalog — add it manually if needed
                    </span>
                  </li>
                ))}
                {phase.result.matched.length === 0 && phase.result.unmatched.length === 0 && (
                  <li className="py-4 text-center text-sm text-zinc-400">
                    No courses were found in this transcript.
                  </li>
                )}
              </ul>
              {phase.error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{phase.error}</p>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  disabled={selectedRows.length === 0}
                  onClick={apply}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Create plan with {selectedRows.length} course
                  {selectedRows.length === 1 ? '' : 's'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
