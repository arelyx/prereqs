import { displayCode } from '../api'
import { useStore } from '../store'

export default function GEPanel() {
  const ge = useStore().validation?.ge_progress ?? []
  if (!ge.length) return null
  const done = ge.filter((g) => g.satisfied).length
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">General Education</h3>
        <span className="text-xs text-slate-400">
          {done}/{ge.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {ge.map((g) => (
          <div
            key={g.category}
            title={
              g.satisfied
                ? `${g.label} — satisfied by ${g.by
                    .flatMap((b) => b.courses)
                    .map(displayCode)
                    .join(', ')}`
                : g.label
            }
            className={`rounded-md border px-2 py-1 text-xs ${
              g.satisfied
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <span className="font-semibold">{g.category}</span> {g.satisfied ? '✓' : ''}
            <div className="text-[10px] leading-tight opacity-70">{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
