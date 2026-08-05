// Quarter-by-quarter planner: completed-courses row + one row per academic
// year (fall → summer). Adding a year adds all four quarters at once.
// Validation issues render as full-text badges — never truncated.

import { useMemo } from 'react'
import { displayCode } from '../api'
import type { ValidationIssue } from '../api'
import { useStore } from '../store'
import { academicYearOf, ayLabel, ayTermCodes, parseTermCode } from '../terms'
import CourseSearch from './CourseSearch'
import TranscriptImport from './TranscriptImport'

const SEVERITY_STYLE: Record<string, string> = {
  error: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800',
  warning: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  info: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800',
}

function IssueBadges({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) return null
  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {issues.map((i, idx) => (
        <div
          key={idx}
          className={`rounded border px-1 py-px text-[10px] leading-4 break-words ${SEVERITY_STYLE[i.severity]}`}
        >
          {i.message}
        </div>
      ))}
    </div>
  )
}

/** Per-course escape hatch from prerequisite checking, for the cases the
 * catalog can't see: transfer credit, an equivalent taken elsewhere, a
 * petition. Offered only where it would change something — next to a live
 * prereq complaint — so it doesn't clutter every course in the plan. */
function PrereqWaiver({ code, issues }: { code: string; issues: ValidationIssue[] }) {
  const store = useStore()
  const waived = store.content.waived.includes(code)
  if (waived) {
    return (
      <button
        className="mt-0.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        onClick={() => store.toggleWaived(code)}
        title="Check this course's prerequisites again"
      >
        prereqs not checked · <span className="underline">undo</span>
      </button>
    )
  }
  if (!issues.some((i) => i.kind === 'missing_prereq' || i.kind === 'concurrent_prereq')) return null
  return (
    <button
      className="mt-0.5 text-[10px] text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
      onClick={() => store.toggleWaived(code)}
      title="Already satisfied by transfer credit, an equivalent course, or a petition"
    >
      skip this check
    </button>
  )
}

function QuarterCell({
  termCode,
  courses,
  issuesFor,
  onOpenCourse,
}: {
  termCode: string
  courses: string[]
  issuesFor: (code: string, term: string | null) => ValidationIssue[]
  onOpenCourse: (code: string) => void
}) {
  const store = useStore()
  const { season } = parseTermCode(termCode)
  return (
    <div className="flex min-h-36 flex-col rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-2">
      <div className="mb-1.5 text-xs font-semibold capitalize text-zinc-500 dark:text-zinc-400">{season}</div>
      <ul className="mb-2 space-y-1.5">
        {courses.map((code) => (
          <li
            key={code}
            className={`rounded-md border p-1.5 ${
              store.dormant.has(code) ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                className={`text-sm font-medium hover:underline ${
                  store.dormant.has(code) ? 'text-red-700 dark:text-red-300' : 'hover:text-sky-700 dark:hover:text-sky-300'
                }`}
                title={store.dormant.has(code) ? 'Not offered in the last 5 years — likely unavailable' : undefined}
                onClick={() => onOpenCourse(code)}
              >
                {displayCode(code)}
              </button>
              <button
                aria-label={`remove ${code}`}
                className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => store.removeCourse(termCode, code)}
              >
                ×
              </button>
            </div>
            <IssueBadges issues={issuesFor(code, termCode)} />
            <PrereqWaiver code={code} issues={issuesFor(code, termCode)} />
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <CourseSearch placeholder="Add course…" onSelect={(c) => store.addCourse(termCode, c.code)} />
      </div>
    </div>
  )
}

export default function Planner({ onOpenCourse }: { onOpenCourse: (code: string) => void }) {
  const store = useStore()
  const { content } = store
  const issues = store.validation?.issues ?? []

  const issuesFor = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>()
    for (const i of issues) {
      const key = `${i.course ?? ''}@${i.term_code ?? ''}`
      map.set(key, [...(map.get(key) ?? []), i])
    }
    return (code: string, term: string | null) => map.get(`${code}@${term ?? ''}`) ?? []
  }, [issues])

  const byTerm = useMemo(
    () => new Map(content.terms.map((t) => [t.term_code, t.courses])),
    [content.terms],
  )
  const years = useMemo(
    () =>
      [...new Set(content.terms.map((t) => academicYearOf(t.term_code)))].sort((a, b) => a - b),
    [content.terms],
  )

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Completed courses</h3>
          <div className="flex items-center gap-2">
            <TranscriptImport />
            <span className="text-xs text-zinc-400">{content.completed.length} courses</span>
          </div>
        </div>
        <div className="mb-2">
          <CourseSearch
            placeholder="Add a course you already took…"
            onSelect={(c) => store.addCompleted(c.code)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {content.completed.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium"
            >
              <button className="hover:underline" onClick={() => onOpenCourse(code)}>
                {displayCode(code)}
              </button>
              <button
                aria-label={`remove ${code}`}
                className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => store.setCompleted(content.completed.filter((c) => c !== code))}
              >
                ×
              </button>
            </span>
          ))}
          {content.completed.length === 0 && (
            <p className="text-xs text-zinc-400">
              Nothing yet — add what you've taken so prerequisite checks are accurate.
            </p>
          )}
        </div>
      </section>

      {/* Students mid-degree can record earlier years as real schedules
          rather than lumping everything into Completed courses. */}
      {years.length > 0 && (
        <GapAddButton year={years[0] - 1} label={`+ Add previous year (${ayLabel(years[0] - 1)})`} onAdd={store.addYear} />
      )}

      {years.map((year, i) => (
        <div key={year} className="space-y-3">
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{ayLabel(year)}</h3>
              <button
                className="text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => {
                  const count = ayTermCodes(year).reduce(
                    (n, tc) => n + (byTerm.get(tc)?.length ?? 0),
                    0,
                  )
                  if (
                    count === 0 ||
                    confirm(
                      `Remove ${ayLabel(year)}? It has ${count} planned course${count > 1 ? 's' : ''} that will be removed with it.`,
                    )
                  ) {
                    store.removeYear(year)
                  }
                }}
                title="Remove this academic year and its courses"
              >
                remove year
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {ayTermCodes(year).map((termCode) => (
                <QuarterCell
                  key={termCode}
                  termCode={termCode}
                  courses={byTerm.get(termCode) ?? []}
                  issuesFor={issuesFor}
                  onOpenCourse={onOpenCourse}
                />
              ))}
            </div>
          </section>
          {/* Gap between this year and the next: offer to restore the missing year. */}
          {i < years.length - 1 && years[i + 1] > year + 1 && (
            <GapAddButton year={year + 1} onAdd={store.addYear} />
          )}
        </div>
      ))}

      <button
        onClick={() => store.addYear()}
        className="w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 py-1.5 text-xs text-zinc-400 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-400"
      >
        + Add academic year
      </button>
    </div>
  )
}

function GapAddButton({ year, label, onAdd }: { year: number; label?: string; onAdd: (y: number) => void }) {
  return (
    <button
      onClick={() => onAdd(year)}
      className="w-full rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 py-1.5 text-xs text-zinc-400 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-400"
    >
      {label ?? `+ Add ${ayLabel(year)}`}
    </button>
  )
}
