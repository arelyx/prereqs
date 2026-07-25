// Quarter-by-quarter planner: completed-courses row + term columns.
// Validation issues from the store are grouped per course+term and rendered
// as colored badges with tooltips.

import { useMemo } from 'react'
import { displayCode } from '../api'
import type { ValidationIssue } from '../api'
import { useStore } from '../store'
import { termLabel } from '../terms'
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
          title={i.message}
          className={`truncate rounded border px-1 py-px text-[10px] leading-4 ${SEVERITY_STYLE[i.severity]}`}
        >
          {i.message}
        </div>
      ))}
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
              className="group inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium"
            >
              <button className="hover:underline" onClick={() => onOpenCourse(code)}>
                {displayCode(code)}
              </button>
              <button
                aria-label={`remove ${code}`}
                className="text-slate-500 hover:text-red-600"
                onClick={() =>
                  store.setCompleted(content.completed.filter((c) => c !== code))
                }
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

      <div className="flex gap-3 overflow-x-auto pb-2">
        {content.terms.map((term) => (
          <section
            key={term.term_code}
            className="w-64 shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{termLabel(term.term_code)}</h3>
              <button
                className="text-xs text-slate-400 hover:text-red-600"
                onClick={() => store.removeTerm(term.term_code)}
                title="Remove this quarter"
              >
                remove
              </button>
            </div>
            <div className="mb-2">
              <CourseSearch
                placeholder="Add course…"
                onSelect={(c) => store.addCourse(term.term_code, c.code)}
              />
            </div>
            <ul className="space-y-1.5">
              {term.courses.map((code) => (
                <li key={code} className="rounded-md border border-slate-200 p-1.5">
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
                      onClick={() => store.removeCourse(term.term_code, code)}
                    >
                      ×
                    </button>
                  </div>
                  <IssueBadges issues={issuesFor(code, term.term_code)} />
                </li>
              ))}
              {term.courses.length === 0 && (
                <li className="text-xs text-slate-400">Empty quarter</li>
              )}
            </ul>
          </section>
        ))}
        <button
          onClick={store.addTerm}
          className="h-24 w-40 shrink-0 self-start rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600"
        >
          + Add quarter
        </button>
      </div>
    </div>
  )
}
