// Course drawer: catalog info, availability (seasons, next planned terms,
// predicted instructors), prereq structure, and the graph.

import { useEffect, useState } from 'react'
import { api, displayCode } from '../api'
import type { CourseDetail, OfferingHistoryRow } from '../api'
import { useStore } from '../store'
import { academicYearOf, ayLabel, termLabel } from '../terms'
import GraphView from './GraphView'

const SEASONS = ['fall', 'winter', 'spring', 'summer']

function HistoryGrid({ history }: { history: OfferingHistoryRow[] }) {
  // Pivot: academic-year rows × quarter columns — when a course runs is
  // visible as a column pattern at a glance.
  const byYear = new Map<number, Map<string, OfferingHistoryRow>>()
  for (const h of history) {
    const ay = academicYearOf(h.term_code)
    if (!byYear.has(ay)) byYear.set(ay, new Map())
    byYear.get(ay)!.set(h.season, h)
  }
  const years = [...byYear.keys()].sort((a, b) => b - a) // newest first

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-1 pr-3 font-semibold">Year</th>
            {SEASONS.map((s) => (
              <th key={s} className="py-1 pr-2 font-semibold capitalize">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((ay) => (
            <tr key={ay} className="border-b border-slate-100 align-top">
              <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{ayLabel(ay)}</td>
              {SEASONS.map((s) => {
                const h = byYear.get(ay)!.get(s)
                if (!h) return <td key={s} className="py-1.5 pr-2 text-slate-300">—</td>
                return (
                  <td
                    key={s}
                    className={`py-1.5 pr-2 ${h.planned ? 'rounded bg-sky-50' : ''}`}
                  >
                    {h.instructors.length > 0 ? (
                      <span>{h.instructors.join(', ')}</span>
                    ) : (
                      <span className="text-slate-400">TBD</span>
                    )}
                    {h.sections > 1 && (
                      <span className="ml-1 text-[10px] text-slate-400">×{h.sections}</span>
                    )}
                    {h.planned && (
                      <span className="ml-1 rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-700">
                        scheduled
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CoursePanel({ code, onClose, onOpenCourse }: {
  code: string
  onClose: () => void
  onOpenCourse: (code: string) => void
}) {
  const [detail, setDetail] = useState<CourseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const store = useStore()

  useEffect(() => {
    setDetail(null)
    setError(null)
    api
      .courseDetail(code)
      .then(setDetail)
      .catch((e) => setError(String(e.message ?? e)))
  }, [code])

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {detail ? detail.display_code : displayCode(code)}
            {detail && <span className="ml-2 text-base font-normal text-slate-600">{detail.title}</span>}
          </h2>
          {detail && (
            <p className="mt-0.5 text-xs text-slate-500">
              {detail.credits} credits · {detail.division}-division
              {detail.ge_codes.length > 0 && <> · GE: {detail.ge_codes.join(', ')}</>}
              {detail.repeatable && ' · repeatable'}
              {detail.formerly && ` · (${detail.formerly})`}
            </p>
          )}
        </div>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">
          ✕ close
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!detail && !error && <p className="text-sm text-slate-400">loading…</p>}

      {detail && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-700">{detail.description}</p>

          {detail.raw_requirements && (
            <section className="rounded-md bg-slate-50 p-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requirements (catalog text)
              </h3>
              <p className="text-sm text-slate-700">{detail.raw_requirements}</p>
            </section>
          )}

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Offering history
            </h3>
            {detail.availability && (
              <div className="mb-2 flex gap-2">
                {SEASONS.map((s) => {
                  const n = detail.availability!.season_counts?.[s] ?? 0
                  return (
                    <span
                      key={s}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        n > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                      }`}
                      title={`offered ${n} recent ${s} quarters`}
                    >
                      {s} {n > 0 ? `×${n}` : '—'}
                    </span>
                  )
                })}
              </div>
            )}
            {detail.offering_history.length > 0 ? (
              <HistoryGrid history={detail.offering_history} />
            ) : (
              <p className="text-sm text-slate-400">
                No offering records in the last five years — verify with the registrar before
                planning around this course.
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prerequisite structure
            </h3>
            {detail.prereq_groups === null ? (
              <p className="text-sm text-amber-700">
                Could not be structured automatically — read the catalog text above.
              </p>
            ) : detail.prereq_groups.length === 0 ? (
              <p className="text-sm text-slate-500">No course prerequisites.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1 text-sm">
                {detail.prereq_groups.map((group, gi) => (
                  <span key={gi} className="flex items-center gap-1">
                    {gi > 0 && <span className="text-xs font-bold text-slate-400">AND</span>}
                    <span className="rounded-md border border-slate-300 px-1.5 py-0.5">
                      {group.map((c, ci) => (
                        <span key={c}>
                          {ci > 0 && <span className="text-xs text-slate-400"> or </span>}
                          <button className="font-medium hover:underline" onClick={() => onOpenCourse(c)}>
                            {displayCode(c)}
                          </button>
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </section>

          <GraphView code={detail.code} />

          {detail.postreqs.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unlocks ({detail.postreqs.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.postreqs.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => onOpenCourse(p.code)}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                    title={p.title}
                  >
                    {p.display_code}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
              onClick={() => store.addCompleted(detail.code)}
            >
              Mark completed
            </button>
            {store.content.terms.map((t) => (
              <button
                key={t.term_code}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-sky-50"
                onClick={() => store.addCourse(t.term_code, detail.code)}
              >
                + {termLabel(t.term_code)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
