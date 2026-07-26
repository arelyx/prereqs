// Sidebar: program picker + general info per chosen program (introduction,
// learning outcomes, ...). Requirement progress lives in the main fold
// (ProgramRequirements), not here.

import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ProgramDetail, ProgramSummary } from '../api'
import { useStore } from '../store'

export default function ProgramsSidebar() {
  const store = useStore()
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [details, setDetails] = useState<Record<number, ProgramDetail>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.programs().then(setPrograms).catch((e) => setError(String(e.message ?? e)))
  }, [])

  useEffect(() => {
    for (const id of store.programIds) {
      if (!details[id]) {
        api
          .programDetail(id)
          .then((d) => setDetails((prev) => ({ ...prev, [id]: d })))
          .catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.programIds])

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
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs"
              >
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

      {store.programIds.map((id) => {
        const d = details[id]
        if (!d) return null
        const info = d.requirements?.info_sections ?? []
        return (
          <div key={id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{d.name}</h3>
              {d.verification !== 'verified' && (
                <span
                  className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                  title="Structured automatically from the catalog page; not yet hand-verified."
                >
                  unverified
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-slate-500">
              {d.degree} · {d.catalog_year ?? 'current'} catalog ·{' '}
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 hover:underline"
              >
                official page
              </a>
            </p>
            {info.length === 0 && (
              <p className="text-xs text-slate-400">No general information captured.</p>
            )}
            {info.map((s, i) => (
              <details key={i} className="mb-1" open={i === 0}>
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                  {s.title}
                </summary>
                <div className="mt-1 space-y-1.5">
                  {s.paragraphs.map((p, pi) => (
                    <p key={pi} className="text-xs leading-relaxed text-slate-600">
                      {p}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )
      })}
    </div>
  )
}
