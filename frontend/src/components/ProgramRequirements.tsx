// Main-fold program requirements: a faithful mirror of the catalog page's
// requirement structure with per-rule progress highlighting. Deliberately
// NOT a degree audit — no aggregate met-counters, and non-mechanical rules
// (electives, ranges, categories) render gray with a verify-manually hazard.
// Programs and their sections both collapse; the arrangement persists in
// localStorage so a reload isn't a jarring reset (no network involved).

import { useState } from 'react'
import { useStore } from '../store'
import { RuleRow } from './rules'

const HIDDEN_KINDS = new Set(['qualification', 'screening'])

const COLLAPSE_KEY = 'prereqs.reqCollapse'

// Explicit open/closed choices only; anything unkeyed falls back to the
// defaults (programs collapsed, sections expanded).
interface CollapseState {
  programs: Record<string, boolean>
  sections: Record<string, boolean>
}

function readCollapse(): CollapseState {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { programs: parsed.programs ?? {}, sections: parsed.sections ?? {} }
    }
  } catch {
    // corrupted state: fall through to defaults
  }
  return { programs: {}, sections: {} }
}

export default function ProgramRequirements({
  onOpenCourse,
}: {
  onOpenCourse: (code: string) => void
}) {
  const store = useStore()
  const [collapse, setCollapse] = useState<CollapseState>(readCollapse)
  const progress = store.validation?.programs ?? []
  if (!progress.length) return null

  const save = (next: CollapseState) => {
    setCollapse(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
    } catch {
      // storage full/unavailable: state still applies for this session
    }
  }

  const programOpen = (id: number) => collapse.programs[id] ?? false
  const sectionOpen = (key: string) => collapse.sections[key] ?? true
  const toggleProgram = (id: number) =>
    save({ ...collapse, programs: { ...collapse.programs, [id]: !programOpen(id) } })
  const toggleSection = (key: string) =>
    save({ ...collapse, sections: { ...collapse.sections, [key]: !sectionOpen(key) } })

  return (
    <>
      {progress.map((prog) => {
        const isOpen = programOpen(prog.program_id)
        const sections = prog.sections.filter((s) => !HIDDEN_KINDS.has(s.kind))
        return (
          <section
            key={prog.program_id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
          >
            <button
              className="flex w-full items-baseline gap-3 p-4 text-left"
              onClick={() => toggleProgram(prog.program_id)}
              aria-expanded={isOpen}
            >
              <span className="text-zinc-400">{isOpen ? '▾' : '▸'}</span>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{prog.name}</h2>
              {prog.verification !== 'verified' && (
                <span
                  className="rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
                  title="Structured automatically from the catalog page; not yet hand-verified. Cross-check with the official catalog."
                >
                  unverified
                </span>
              )}
            </button>
            {isOpen && (
              <div className="space-y-4 px-4 pb-4">
                <p className="text-[11px] text-zinc-400">
                  Mirrors the official catalog page — confirm your degree progress with an
                  academic adviser.
                </p>
                {sections.map((section, si) => {
                  const key = `${prog.program_id}:${si}:${section.title}`
                  const secOpen = sectionOpen(key)
                  return (
                    <div key={si}>
                      <button
                        className="mb-1.5 flex w-full items-center gap-1.5 text-left"
                        onClick={() => toggleSection(key)}
                        aria-expanded={secOpen}
                      >
                        <span className="text-xs text-zinc-400">{secOpen ? '▾' : '▸'}</span>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {section.title}
                          {section.concentration &&
                            section.concentration !== section.title &&
                            ` — ${section.concentration}`}
                        </h3>
                      </button>
                      {secOpen && (
                        <div className="space-y-1.5">
                          {section.rules.map((r, ri) => (
                            <RuleRow key={ri} rule={r} onOpenCourse={onOpenCourse} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
