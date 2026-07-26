// Major/minor requirement progress. Programs marked 'unverified' carry a
// visible banner — the pipeline structured them but no one has hand-checked
// the result against the catalog page.

import { useEffect, useState } from 'react'
import { api, displayCode } from '../api'
import type { ProgramSummary, RuleProgress } from '../api'
import { useStore } from '../store'

const OP_LABELS: Record<string, (r: RuleProgress) => string> = {
  all_of: (r) => `All of ${r.courses.length}`,
  one_of: () => 'One of',
  n_of: (r) => (r.courses.length ? `${r.n} of ${r.courses.length}` : `${r.n} from the lists below`),
  options: () => 'One full option',
  range: (r) => `${r.n ?? '?'} from range`,
  category_count: (r) => `${r.n ?? '?'} from category`,
  section_choice: () => 'One of the paths below',
  list: () => 'Course pool',
  info: () => 'Note',
}

function RuleRow({ rule, onOpenCourse }: { rule: RuleProgress; onOpenCourse: (c: string) => void }) {
  const satisfied = rule.satisfied === true
  const informational = rule.op === 'list' || rule.op === 'info'
  const unevaluated = rule.satisfied === null && !informational
  const label = (OP_LABELS[rule.op] ?? (() => rule.op))(rule)

  if (rule.op === 'info' && rule.courses.length === 0) {
    // Policy prose: render compactly, no status dot.
    const text = rule.source?.prose?.join(' ') ?? ''
    if (!text && rule.notes.length === 0) return null
    return (
      <div className="rounded-md bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-500">
        {rule.source?.heading && <span className="font-semibold">{rule.source.heading}: </span>}
        {text}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            satisfied ? 'bg-emerald-500' : unevaluated ? 'bg-slate-300' : 'bg-amber-400'
          }`}
        />
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {rule.done != null && rule.needed != null && (
          <span className="text-xs text-slate-400">
            {rule.done}/{rule.needed}
          </span>
        )}
        {unevaluated && (
          <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500" title="This rule can't be checked mechanically — read the note and verify manually.">
            manual check
          </span>
        )}
      </div>
      {rule.source?.heading && (
        <p className="mt-0.5 text-[11px] italic text-slate-400">“{rule.source.heading}”</p>
      )}
      {rule.courses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {rule.courses.map((c) => (
            <button
              key={c}
              onClick={() => onOpenCourse(c)}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                rule.have.includes(c)
                  ? 'bg-emerald-100 text-emerald-800 line-through decoration-emerald-500'
                  : 'bg-slate-100 text-slate-700 hover:bg-sky-100'
              }`}
            >
              {displayCode(c)}
            </button>
          ))}
        </div>
      )}
      {(rule.branches ?? []).map((branch, i) => (
        <div key={i} className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400">{i === 0 ? 'EITHER' : 'OR'}</span>
          {branch.map((c) => (
            <button
              key={c}
              onClick={() => onOpenCourse(c)}
              className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100"
            >
              {displayCode(c)}
            </button>
          ))}
        </div>
      ))}
      {rule.constraints.map((c, i) => (
        <p key={i} className="mt-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
          ⚠ {c.text}
        </p>
      ))}
      {rule.notes.map((n, i) => (
        <p key={i} className="mt-1 text-[11px] text-slate-500">
          ℹ {n}
        </p>
      ))}
    </div>
  )
}

export default function RequirementsPanel({ onOpenCourse }: { onOpenCourse: (c: string) => void }) {
  const store = useStore()
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.programs().then(setPrograms).catch((e) => setError(String(e.message ?? e)))
  }, [])

  const progress = store.validation?.programs ?? []

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Your programs</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value=""
          onChange={(e) => {
            const id = Number(e.target.value)
            if (id && !store.programIds.includes(id)) store.setPrograms([...store.programIds, id])
          }}
        >
          <option value="">Add a major or minor…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.verification === 'verified' ? '✓' : '(unverified)'}
            </option>
          ))}
        </select>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {store.programIds.map((id) => {
            const p = programs.find((x) => x.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs">
                {p?.name ?? id}
                <button
                  className="text-slate-500 hover:text-red-600"
                  onClick={() => store.setPrograms(store.programIds.filter((x) => x !== id))}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      </div>

      {progress.map((prog) => (
        <div key={prog.program_id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{prog.name}</h3>
            {prog.verification !== 'verified' && (
              <span
                className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                title="Structured automatically from the catalog page; not yet hand-verified. Cross-check with the official catalog."
              >
                unverified
              </span>
            )}
          </div>
          {prog.sections
            .filter((s) => s.kind !== 'qualification' && s.kind !== 'screening')
            .map((section, si) => (
              <details key={si} open={si < 3} className="mb-1">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.title}
                  {section.concentration && ` — ${section.concentration}`}
                </summary>
                <div className="mt-1 space-y-1.5">
                  {section.rules.map((r, ri) => (
                    <RuleRow key={ri} rule={r} onOpenCourse={onOpenCourse} />
                  ))}
                </div>
              </details>
            ))}
        </div>
      ))}
    </div>
  )
}
