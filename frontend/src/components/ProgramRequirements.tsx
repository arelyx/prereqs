// Main-fold degree progress: one dashboard per chosen program. Requirements
// are program harnesses (harnesses/ucsc/<edition>/<slug>/), evaluated in the
// browser against the plan; the registry picks the harness for the plan's
// catalog edition. A program without a harness for that edition gets an
// honest "not modelled yet" card — never a guessed checklist.

import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ProgramSummary } from '../api'
import { findHarness } from '../harness/registry'
import { useStore } from '../store'
import ProgramDashboard from './degree/ProgramDashboard'

let programsCache: Promise<ProgramSummary[]> | null = null
function usePrograms(): ProgramSummary[] {
  const [list, setList] = useState<ProgramSummary[]>([])
  useEffect(() => {
    programsCache ??= api.programs().catch((e) => {
      programsCache = null
      throw e
    })
    programsCache.then(setList).catch(() => {})
  }, [])
  return list
}

export default function ProgramRequirements({
  onOpenCourse,
}: {
  onOpenCourse: (code: string) => void
}) {
  const store = useStore()
  const programs = usePrograms()
  const chosen = store.programIds
    .map((id) => programs.find((p) => p.id === id))
    .filter((p): p is ProgramSummary => !!p)
  if (!chosen.length) return null

  return (
    <>
      {chosen.map((p) => {
        const entry = findHarness(p.edition, p.slug)
        if (entry) return <ProgramDashboard key={p.id} program={p} entry={entry} onOpenCourse={onOpenCourse} />
        return (
          <section
            key={p.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm"
          >
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {p.name} <span className="text-sm font-normal text-zinc-500">{p.edition} catalog</span>
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Requirements for this program in the {p.edition} catalog aren&apos;t modelled yet. Read the
              official page and confirm with an adviser.
            </p>
          </section>
        )
      })}
    </>
  )
}
