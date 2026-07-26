// Shared rule-row rendering for requirement progress displays.

import { displayCode } from '../api'
import type { RuleProgress } from '../api'

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

export function RuleRow({ rule, onOpenCourse }: { rule: RuleProgress; onOpenCourse: (c: string) => void }) {
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

