// Shared rule-row rendering for requirement progress displays.

import { displayCode } from '../api'
import type { RuleProgress } from '../api'
import { useStore } from '../store'

const OP_LABELS: Record<string, (r: RuleProgress) => string> = {
  all_of: (r) => `All of ${r.courses.length}`,
  one_of: () => 'One of',
  n_of: (r) => (r.courses.length ? `${r.n} of ${r.courses.length}` : `${r.n} from the lists below`),
  options: () => 'One full option',
  range: (r) => `${r.n ?? '?'} from the ranges below`,
  category_count: (r) => `${r.n ?? '?'} from category`,
  section_choice: () => 'One of the paths below',
  n_of_groups: (r) => `One course from ${r.n} of the ${r.branches?.length ?? '?'} groups`,
  list: () => 'Course pool',
  info: () => 'Note',
}

export function RuleRow({ rule, onOpenCourse }: { rule: RuleProgress; onOpenCourse: (c: string) => void }) {
  const satisfied = rule.satisfied === true
  const informational = rule.op === 'list' || rule.op === 'info'
  const manual = rule.manual === true && !informational
  const unevaluated = rule.satisfied === null && !informational && !manual
  const label = (OP_LABELS[rule.op] ?? (() => rule.op))(rule)
  const dormant = useStore().dormant

  // One chip language everywhere: taken (green, struck) wins over dormant
  // (red) wins over default — branch chips included.
  const chipClass = (c: string) =>
    rule.have.includes(c)
      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-500'
      : dormant.has(c)
        ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-sky-100 dark:hover:bg-zinc-800'
  const chipTitle = (c: string) =>
    !rule.have.includes(c) && dormant.has(c)
      ? 'Not offered in the last 5 years — likely unavailable'
      : undefined

  // Junk-data guard: never render an empty ℹ️ chip.
  const notes = rule.notes.filter((n) => n.trim())

  // A filter is requirement content ("any CSE 100–189 …"). Its presence —
  // never the rule's op — decides whether it renders, so no rule shape can
  // silently omit it (the CS B.S. electives bug).
  const filter =
    rule.filter &&
    ((rule.filter.include_ranges?.length ?? 0) > 0 ||
      (rule.filter.include_series?.length ?? 0) > 0 ||
      (rule.filter.exclude_codes?.length ?? 0) > 0 ||
      (rule.filter.exclude_ranges?.length ?? 0) > 0)
      ? rule.filter
      : null
  const hasFilter = filter !== null

  if (rule.op === 'info' && rule.courses.length === 0 && !hasFilter) {
    // Policy prose: render compactly, no status dot. Notes render too —
    // this path used to silently drop them.
    const text = rule.source?.prose?.join(' ') ?? ''
    if (!text && notes.length === 0) return null
    return (
      <div className="space-y-1 rounded-md bg-sky-50 dark:bg-sky-950/60 p-2 text-[11px] leading-relaxed text-sky-800 dark:text-sky-200">
        <p>
          ℹ️ {rule.source?.heading && <span className="font-semibold">{rule.source.heading}: </span>}
          {text}
        </p>
        {notes.map((n, i) => (
          <p key={i}>ℹ️ {n}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            informational
              ? 'bg-sky-400'
              : manual || unevaluated
                ? 'bg-zinc-300 dark:bg-zinc-600'
                : satisfied
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
          }`}
        />
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
        {rule.done != null && rule.needed != null && (
          <span className="text-xs text-zinc-400">
            {rule.done}/{rule.needed}
          </span>
        )}
        {(manual || unevaluated) && (
          <span
            className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 text-[10px] text-zinc-500 dark:text-zinc-400"
            title="Elective eligibility and category membership can depend on rules the app can't check (double-counting bans, approvals, external lists). Verify with an adviser."
          >
            ⚠ verify manually
          </span>
        )}
      </div>
      {rule.source?.heading && (
        <p className="mt-0.5 text-[11px] italic text-zinc-400">“{rule.source.heading}”</p>
      )}
      {filter && (
        <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">
            {rule.op === 'range'
              ? 'Counts: '
              : rule.op === 'all_of'
                ? 'Substitution option: '
                : 'Also counts: '}
          </span>
          {(filter.include_ranges ?? [])
            .map((r) => `${r.subject} ${r.lo}–${r.hi}`)
            .concat((filter.include_series ?? []).map((s) => `${s.subject} ${s.prefix} series`))
            .join(', ')}
          {((filter.exclude_codes?.length ?? 0) > 0 ||
            (filter.exclude_ranges?.length ?? 0) > 0) && (
            <>
              {' '}
              <span className="font-medium">excluding </span>
              {(filter.exclude_ranges ?? [])
                .map((r) => `${r.subject} ${r.lo}–${r.hi}`)
                .concat((filter.exclude_codes ?? []).map(displayCode))
                .join(', ')}
            </>
          )}
          {(rule.matching?.length ?? 0) > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">yours:</span>
              {rule.matching!.map((c) => (
                <button
                  key={c}
                  onClick={() => onOpenCourse(c)}
                  className="rounded bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 hover:underline"
                >
                  {displayCode(c)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {rule.courses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {rule.courses.map((c) => (
            <button
              key={c}
              onClick={() => onOpenCourse(c)}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${chipClass(c)}`}
              title={chipTitle(c)}
            >
              {displayCode(c)}
            </button>
          ))}
        </div>
      )}
      {(rule.branches ?? []).map((branch, i) => (
        <div key={i} className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-zinc-400">
            {rule.op === 'n_of_groups' ? `GROUP ${i + 1}` : i === 0 ? 'EITHER' : 'OR'}
          </span>
          {branch.map((c) => (
            <button
              key={c}
              onClick={() => onOpenCourse(c)}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${chipClass(c)}`}
              title={chipTitle(c)}
            >
              {displayCode(c)}
            </button>
          ))}
        </div>
      ))}
      {rule.constraints.map((c, i) => (
        <p key={i} className="mt-1 rounded bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-300">
          ⚠ {c.text}
        </p>
      ))}
      {notes.map((n, i) => (
        <p key={i} className="mt-1 rounded bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 text-[11px] text-sky-800 dark:text-sky-200">
          ℹ️ {n}
        </p>
      ))}
    </div>
  )
}

