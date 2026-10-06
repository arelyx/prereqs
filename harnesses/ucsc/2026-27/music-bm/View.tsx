// Music B.M. bespoke dashboard: the program is lived quarter by quarter
// (ensemble + lesson every quarter, juries each fall and spring), so the
// centerpiece is a per-quarter performance timeline; course lists below use
// the default renderer.
import { ChoiceBar, ChoiceControl, Leftovers, NodeList } from '@app/components/degree/DefaultReport'
import { Card, CourseChip, Quote, StatusIcon, StatusPill } from '@app/components/degree/ui'
import type { ViewProps } from '@harness/registry'
import type { ReqNode } from '@harness'
import type { QuarterRow } from './harness'

function Cell({ row, juriesOk, onOpen }: { row: QuarterRow; juriesOk: boolean; onOpen: (c: string) => void }) {
  const tone = row.ok
    ? row.planned
      ? 'border-dashed border-sky-400 bg-sky-50/70 dark:border-sky-700 dark:bg-sky-950/30'
      : 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30'
    : 'border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30'
  const slot = (label: string, list: string[]) =>
    list.length ? (
      <div className="flex flex-wrap gap-1">
        {list.map((c) => (
          <CourseChip key={c} code={c.replace(' ', '')} kind={row.planned ? 'planned' : 'done'} onOpen={onOpen} />
        ))}
      </div>
    ) : (
      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">no {label}</span>
    )
  return (
    <div className={`min-w-0 rounded-md border p-2 ${tone}`} data-quarter={row.term}>
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{row.label}</span>
        {row.isJury && (
          <span
            className={`rounded px-1 text-[10px] font-semibold ${juriesOk ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100' : 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100'}`}
            title="Continuing B.M. jury at the end of this quarter"
          >
            jury
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-start gap-1.5">
          <span className="w-12 shrink-0 text-[10px] uppercase text-zinc-500 dark:text-zinc-400">Ensemble</span>
          {slot('ensemble', row.ensembles)}
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-12 shrink-0 text-[10px] uppercase text-zinc-500 dark:text-zinc-400">Lesson</span>
          {slot('lesson', row.lessons)}
        </div>
      </div>
    </div>
  )
}

export default function MusicBMView({ report, onOpenCourse, setChoice, setAttested }: ViewProps) {
  const perf = report.nodes.find((n) => n.id === 'performance') as ReqNode
  const rows = (perf?.data?.quarters ?? []) as QuarterRow[]
  const min = perf?.data?.min as number | null
  const kid = (id: string) => perf?.children?.find((c) => c.id === id)
  const ens = kid('ensembles')
  const les = kid('lessons')
  const juries = kid('attest:juries')
  const juriesOk = juries?.status === 'met'
  // Rows by academic year (fall starts a year).
  const years = new Map<number, QuarterRow[]>()
  for (const r of rows) {
    const n = Number(r.term)
    const y = 2000 + Math.floor((n - 2000) / 10) - (n % 10 === 8 ? 0 : 1)
    if (!years.has(y)) years.set(y, [])
    years.get(y)!.push(r)
  }
  const entryDef = report.choices.find((c) => c.key === 'entry')
  const startDef = report.choices.find((c) => c.key === 'bm_start')
  const others = report.nodes.filter((n) => n.id !== 'performance')
  const counter = (label: string, n: ReqNode | undefined) => (
    <div className="flex items-center gap-2">
      {n && <StatusIcon status={n.status} />}
      <div>
        <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
          {n?.progress?.have ?? 0}
          <span className="text-sm font-medium text-zinc-400"> / {min ?? '?'}</span>
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</div>
      </div>
    </div>
  )
  return (
    <div className="space-y-3">
      <ChoiceBar report={report} setChoice={setChoice} skip={['entry', 'bm_start']} />
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {perf && <StatusIcon status={perf.status} />} Performance — every quarter in the B.M.
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{perf?.detail ?? 'Add your first applied lesson to start the timeline.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {counter('ensemble quarters', ens)}
            {counter('lesson quarters', les)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          {entryDef && (
            <label className="flex items-center gap-2">
              <span className={`font-semibold ${report.activeChoices.entry ? '' : 'text-violet-700 dark:text-violet-300'}`}>Admitted as</span>
              <ChoiceControl def={entryDef} value={report.activeChoices.entry} onChange={(v) => setChoice('entry', v)} />
            </label>
          )}
          {startDef && (
            <label className="flex items-center gap-2">
              <span className="font-semibold">First B.M. quarter</span>
              <ChoiceControl def={startDef} value={report.activeChoices.bm_start} onChange={(v) => setChoice('bm_start', v)} />
            </label>
          )}
          {juries && (
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <input type="checkbox" checked={juriesOk} onChange={(e) => setAttested('juries', e.target.checked)} aria-label="I confirm: Continuing B.M. juries passed each fall and spring" />
              Juries passed each fall &amp; spring so far
            </label>
          )}
        </div>
        {rows.length > 0 ? (
          <div className="mt-3 space-y-2">
            {[...years.entries()].map(([y, qs]) => (
              <div key={y} className="grid grid-cols-[3.5rem_1fr] items-start gap-2">
                <div className="pt-2 text-[11px] font-semibold tabular-nums text-zinc-400">
                  {y}–{String((y + 1) % 100).padStart(2, '0')}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {qs.map((r) => (
                    <Cell key={r.term} row={r} juriesOk={juriesOk} onOpen={onOpenCourse} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 dark:border-zinc-700">
            No program quarters yet: the timeline starts with your first applied lesson (MUSC 61, 62, 161, 161A or 162).
          </p>
        )}
        {[ens, les].map(
          (n) =>
            n &&
            n.status !== 'met' &&
            n.detail && (
              <p key={n.id} className="mt-2 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <StatusPill status={n.status} /> {n.title}: {n.detail}
              </p>
            ),
        )}
        <Quote quote={[...(Array.isArray(ens?.quote) ? ens!.quote : []), ...(Array.isArray(les?.quote) ? les!.quote : [])]} />
      </Card>
      <NodeList report={report} nodes={others} onOpen={onOpenCourse} setChoice={setChoice} setAttested={setAttested} />
      <Leftovers report={report} onOpen={onOpenCourse} />
    </div>
  )
}
