// Main-fold program requirements: a faithful mirror of the catalog page's
// requirement structure with per-rule progress highlighting. Deliberately
// NOT a degree audit — no aggregate met-counters, and non-mechanical rules
// (electives, ranges, categories) render gray with a verify-manually hazard.
// Each program collapses like the GE tiles.

import { useState } from 'react'
import { useStore } from '../store'
import { RuleRow } from './rules'

const HIDDEN_KINDS = new Set(['qualification', 'screening'])

export default function ProgramRequirements({
  onOpenCourse,
}: {
  onOpenCourse: (code: string) => void
}) {
  const store = useStore()
  const [open, setOpen] = useState<Set<number>>(new Set())
  const progress = store.validation?.programs ?? []
  if (!progress.length) return null

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      {progress.map((prog) => {
        const isOpen = open.has(prog.program_id)
        const sections = prog.sections.filter((s) => !HIDDEN_KINDS.has(s.kind))
        return (
          <section
            key={prog.program_id}
            className="rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <button
              className="flex w-full items-baseline gap-3 p-4 text-left"
              onClick={() => toggle(prog.program_id)}
              aria-expanded={isOpen}
            >
              <span className="text-slate-400">{isOpen ? '▾' : '▸'}</span>
              <h2 className="text-base font-bold text-slate-900">{prog.name}</h2>
              {prog.verification !== 'verified' && (
                <span
                  className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                  title="Structured automatically from the catalog page; not yet hand-verified. Cross-check with the official catalog."
                >
                  unverified
                </span>
              )}
            </button>
            {isOpen && (
              <div className="space-y-4 px-4 pb-4">
                <p className="text-[11px] text-slate-400">
                  Mirrors the official catalog page — confirm your degree progress with an
                  academic adviser.
                </p>
                {sections.map((section, si) => (
                  <div key={si}>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {section.title}
                      {section.concentration &&
                        section.concentration !== section.title &&
                        ` — ${section.concentration}`}
                    </h3>
                    <div className="space-y-1.5">
                      {section.rules.map((r, ri) => (
                        <RuleRow key={ri} rule={r} onOpenCourse={onOpenCourse} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
