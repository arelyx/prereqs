// Main-fold requirement progress: one block per chosen program, every
// course-requirement section expanded so met/unmet counts are visible at a
// glance. Policy/qualification sections stay out (sidebar has program info).

import { useStore } from '../store'
import { RuleRow } from './rules'

const HIDDEN_KINDS = new Set(['qualification', 'screening'])

export default function ProgramRequirements({
  onOpenCourse,
}: {
  onOpenCourse: (code: string) => void
}) {
  const store = useStore()
  const progress = store.validation?.programs ?? []
  if (!progress.length) return null

  return (
    <>
      {progress.map((prog) => {
        const sections = prog.sections.filter((s) => !HIDDEN_KINDS.has(s.kind))
        const evaluable = sections.flatMap((s) =>
          s.rules.filter((r) => r.satisfied !== null && r.satisfied !== undefined),
        )
        const met = evaluable.filter((r) => r.satisfied).length
        return (
          <section
            key={prog.program_id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-base font-bold text-slate-900">{prog.name}</h2>
              <span className="text-sm text-slate-500">
                {met}/{evaluable.length} requirements met
              </span>
              {prog.verification !== 'verified' && (
                <span
                  className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                  title="Structured automatically from the catalog page; not yet hand-verified. Cross-check with the official catalog."
                >
                  unverified
                </span>
              )}
            </div>
            <div className="space-y-4">
              {sections.map((section, si) => (
                <div key={si}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {section.title}
                    {section.concentration && ` — ${section.concentration}`}
                  </h3>
                  <div className="space-y-1.5">
                    {section.rules.map((r, ri) => (
                      <RuleRow key={ri} rule={r} onOpenCourse={onOpenCourse} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
