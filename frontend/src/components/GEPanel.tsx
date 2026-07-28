// General-education progress. Each category expands to show which of the
// student's courses satisfy it (and via which GE code, since PE/PR have
// sub-codes).

import { useState } from 'react'
import { displayCode } from '../api'
import { useStore } from '../store'

export default function GEPanel({ onOpenCourse }: { onOpenCourse?: (code: string) => void }) {
  const ge = useStore().validation?.ge_progress ?? []
  const [open, setOpen] = useState<Set<string>>(new Set())
  if (!ge.length) return null
  const done = ge.filter((g) => g.satisfied).length

  const toggle = (cat: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">General Education</h3>
        <span className="text-xs text-zinc-400">
          {done}/{ge.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {ge.map((g) => {
          const isOpen = open.has(g.category)
          return (
            <div
              key={g.category}
              className={`rounded-md border text-xs ${
                g.satisfied
                  ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <button
                className="w-full px-2 py-1 text-left"
                onClick={() => toggle(g.category)}
                aria-expanded={isOpen}
              >
                <span className="font-semibold">{g.category}</span> {g.satisfied ? '✓' : ''}
                <span className="float-right text-zinc-400">{isOpen ? '▾' : '▸'}</span>
                <div className="text-[10px] leading-tight opacity-70">{g.label}</div>
              </button>
              {isOpen && (
                <div className="border-t border-black/5 px-2 py-1.5">
                  {g.by.length > 0 ? (
                    g.by.map((b) => (
                      <div key={b.ge} className="mb-1 last:mb-0">
                        {g.by.length > 1 || b.ge !== g.category ? (
                          <span className="mr-1 text-[10px] font-semibold opacity-60">{b.ge}:</span>
                        ) : null}
                        {b.courses.map((c) => (
                          <button
                            key={c}
                            className="mr-1 rounded bg-white/80 px-1 py-0.5 text-[11px] font-medium hover:underline"
                            onClick={() => onOpenCourse?.(c)}
                          >
                            {displayCode(c)}
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] italic opacity-60">
                      No courses in your plan satisfy this yet.
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
