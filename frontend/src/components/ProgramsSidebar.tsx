// Program picker + general info per chosen program (introduction, learning
// outcomes, ...). Requirement progress lives in the main fold
// (ProgramRequirements), not here. Picker and info cards are separate
// components so the mobile layout can slot the requirements between them
// (picker → requirements → general info).

import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Edition, ProgramDetail, ProgramSummary } from '../api'
import { findHarness } from '../harness/registry'
import { useStore } from '../store'

// ✓ = a verified harness exists for this program in this catalog edition.
function harnessLabel(p: ProgramSummary): string {
  const status = findHarness(p.edition, p.slug)?.manifest.status
  return status === 'verified' ? '✓' : status === 'draft' ? '(draft)' : '(not modelled)'
}

// One line of committed source text: "**Lead-in**" sub-headings, "- " /
// "1. " list items, and [label](url) links; everything else is a paragraph.
function InfoLine({ text }: { text: string }) {
  const lead = text.match(/^\*\*(.+)\*\*$/)
  if (lead) return <p className="pt-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{lead[1]}</p>
  const item = text.match(/^(?:- |\d+\. )(.*)$/)
  const body = item ? item[1] : text
  const parts = body.split(/(\[[^\]]+\]\([^)]+\))/g).map((seg, i) => {
    const m = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    return m ? (
      <a key={i} href={m[2]} target="_blank" rel="noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline">
        {m[1]}
      </a>
    ) : (
      seg
    )
  })
  return (
    <p className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-400${item ? ' pl-3 -indent-2' : ''}`}>
      {item && '• '}
      {parts}
    </p>
  )
}

export function ProgramPicker() {
  const store = useStore()
  const [allPrograms, setAllPrograms] = useState<ProgramSummary[]>([])
  const [editions, setEditions] = useState<Edition[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.programs().then(setAllPrograms).catch((e) => setError(String(e.message ?? e)))
    api.editions().then(setEditions).catch(() => {})
  }, [])

  // A plan is bound to one catalog edition (the year the student entered
  // under); null means "the newest edition".
  const current = editions.find((e) => e.current)?.edition ?? null
  const edition = store.content.catalog_year ?? current
  const programs = allPrograms.filter((p) => p.edition === edition)

  const switchEdition = (next: string) => {
    // Keep the student's programs: same slugs, new edition's rows.
    const slugs = store.programIds
      .map((id) => allPrograms.find((p) => p.id === id)?.slug)
      .filter((s): s is string => !!s)
    const ids = slugs
      .map((slug) => allPrograms.find((p) => p.slug === slug && p.edition === next)?.id)
      .filter((id): id is number => id !== undefined)
    store.setCatalogYear(next === current ? null : next, ids)
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Your programs</h3>
        {editions.length > 1 && (
          <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Catalog year
            <select
              aria-label="Catalog year"
              className="rounded border border-zinc-300 dark:border-zinc-800 px-1 py-0.5 text-xs"
              value={edition ?? ''}
              onChange={(e) => switchEdition(e.target.value)}
            >
              {editions.map((e) => (
                <option key={e.edition} value={e.edition}>
                  {e.edition}
                  {e.current ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <select
        aria-label="Add a program"
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-800 px-2 py-1.5 text-sm"
        value=""
        onChange={(e) => {
          const id = Number(e.target.value)
          if (id && !store.programIds.includes(id)) store.setPrograms([...store.programIds, id])
        }}
      >
        <option value="">Add a major or minor…</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} {harnessLabel(p)}
          </option>
        ))}
      </select>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {store.programIds.map((id) => {
          const p = allPrograms.find((x) => x.id === id)
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-xs"
            >
              {p?.name ?? id}
              <button
                className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => store.setPrograms(store.programIds.filter((x) => x !== id))}
              >
                ×
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function ProgramInfoPanels() {
  const store = useStore()
  const [details, setDetails] = useState<Record<number, ProgramDetail>>({})

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
    <>
      {store.programIds.map((id) => {
        const d = details[id]
        if (!d) return null
        const info = d.info_sections ?? []
        return (
          <div key={id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{d.name}</h3>
              {findHarness(d.edition, d.slug)?.manifest.status !== 'verified' && (
                <span
                  className="rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
                  title="This program's requirements are not yet modelled and verified for this catalog year."
                >
                  not verified
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              {d.degree} · {d.edition} catalog ·{' '}
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                official page
              </a>
            </p>
            {info.length === 0 && (
              <p className="text-xs text-zinc-400">No general information captured.</p>
            )}
            {info.map((s, i) => (
              <details key={i} className="mb-1">
                <summary className="cursor-pointer text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {s.title}
                </summary>
                <div className="mt-1 space-y-1.5">
                  {s.paragraphs.map((p, pi) => (
                    <InfoLine key={pi} text={p} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        )
      })}
    </>
  )
}
