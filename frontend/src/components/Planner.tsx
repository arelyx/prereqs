// Quarter-by-quarter planner: completed-courses row + one row per academic
// year (fall → summer). Adding a year adds all four quarters at once.
// Validation issues render as full-text badges — never truncated.

import { useMemo } from 'react'
import { displayCode } from '../api'
import type { ValidationIssue } from '../api'
import { useStore } from '../store'
import { academicYearOf, ayLabel, ayTermCodes, parseTermCode } from '../terms'
import CourseSearch from './CourseSearch'

const SEVERITY_STYLE: Record<string, string> = {
  error: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  info: 'bg-sky-100 text-sky-800 border-sky-300',
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
    <div className="flex min-h-36 flex-col rounded-md border border-slate-200 bg-slate-50/50 p-2">
      <div className="mb-1.5 text-xs font-semibold capitalize text-slate-500">{season}</div>
      <ul className="mb-2 space-y-1.5">
        {courses.map((code) => (
          <li key={code} className="rounded-md border border-slate-200 bg-white p-1.5">
            <div className="flex items-center justify-between">
              <button
                className="text-sm font-medium hover:text-sky-700 hover:underline"
                onClick={() => onOpenCourse(code)}
              >
                {displayCode(code)}
              </button>
              <button
                aria-label={`remove ${code}`}
                className="text-slate-400 hover:text-red-600"
                onClick={() => store.removeCourse(termCode, code)}
              >
                ×
              </button>
            </div>
            <IssueBadges issues={issuesFor(code, termCode)} />
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
      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Completed courses</h3>
          <span className="text-xs text-slate-400">{content.completed.length} courses</span>
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
              className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium"
            >
              <button className="hover:underline" onClick={() => onOpenCourse(code)}>
                {displayCode(code)}
              </button>
              <button
                aria-label={`remove ${code}`}
                className="text-slate-500 hover:text-red-600"
                onClick={() => store.setCompleted(content.completed.filter((c) => c !== code))}
              >
                ×
              </button>
            </span>
          ))}
          {content.completed.length === 0 && (
            <p className="text-xs text-slate-400">
              Nothing yet — add what you've taken so prerequisite checks are accurate.
            </p>
          )}
        </div>
      </section>

      {years.map((year) => (
        <section key={year} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">{ayLabel(year)}</h3>
            <button
              className="text-xs text-slate-400 hover:text-red-600"
              onClick={() => store.removeYear(year)}
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
      ))}

      <button
        onClick={store.addYear}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600"
      >
        + Add academic year
      </button>
    </div>
  )
}
