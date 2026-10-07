// Psychology B.A. bespoke dashboard: the upper division is a puzzle of
// subfields (one each in Developmental/Cognitive/Social, then three more from
// three DIFFERENT subfields, plus a seminar), so it is drawn as a board — one
// column per subfield, each upper-division PSYC course placed where it counts.
import { ChoiceBar, Leftovers, NodeList } from '@app/components/degree/DefaultReport'
import { Card, CourseChip, Quote, StatusIcon, StatusPill } from '@app/components/degree/ui'
import type { ViewProps } from '@harness/registry'
import type { Enrollment, ReqNode } from '@harness'
import { SUBFIELDS } from './harness'

function find(nodes: ReqNode[], id: string): ReqNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const k = n.children && find(n.children, id)
    if (k) return k
  }
  return undefined
}

const ROLE_STYLE: Record<string, string> = {
  core: 'bg-emerald-600 text-white dark:bg-emerald-500',
  additional: 'bg-sky-600 text-white dark:bg-sky-500',
  methods: 'bg-violet-600 text-white dark:bg-violet-500',
  independent: 'bg-amber-500 text-white',
  unused: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

export default function PsychologyView({ report, onOpenCourse, setChoice, setAttested }: ViewProps) {
  const intensive = report.activeChoices.concentration === 'intensive'
  if (!report.activeChoices.concentration) {
    return (
      <div className="space-y-3">
        <ChoiceBar report={report} setChoice={setChoice} />
        <NodeList report={report} onOpen={onOpenCourse} setChoice={setChoice} setAttested={setAttested} />
      </div>
    )
  }
  const roles = new Map<string, string>()
  const mark = (id: string, role: string) => find(report.nodes, id)?.used?.forEach((e) => roles.set(e.id, role))
  SUBFIELDS.slice(0, 3).forEach((s) => mark(`core-${s.key}`, 'core'))
  mark('additional-subfields', 'additional')
  mark('advanced-methods', 'methods')
  mark('independent-study', 'independent')
  const seminar = find(report.nodes, 'seminar')
  const seminarIds = new Set((seminar?.used ?? []).map((e) => e.id))

  // Every upper-division PSYC enrollment in the plan, bucketed by subfield.
  const all: Enrollment[] = []
  const seen = new Set<string>()
  const add = (e: Enrollment) => {
    if (seen.has(e.id) || !/^PSYC1\d\d/.test(e.code)) return
    seen.add(e.id)
    all.push(e)
  }
  const collect = (n: ReqNode) => {
    ;(n.used ?? []).forEach(add)
    n.children?.forEach(collect)
  }
  report.nodes.forEach(collect)
  report.unused.forEach(add)

  const additional = find(report.nodes, 'additional-subfields')
  const ids = ['core-subfields', 'additional-subfields', 'advanced-methods', 'independent-study', 'seminar']
  const rest = report.nodes
    .map((n) => (n.children ? { ...n, children: n.children.filter((k) => !ids.includes(k.id)) } : n))
    .filter((n) => !ids.includes(n.id) && (!n.children || n.children.length))
  const legend: [string, string][] = [
    ['core', 'core subfield course'],
    ['additional', 'one of three more (different subfields)'],
    ...(intensive ? ([['methods', 'advanced research (181/182)'], ['independent', 'independent study quarter']] as [string, string][]) : []),
    ['unused', 'not needed'],
  ]
  return (
    <div className="space-y-3">
      <ChoiceBar report={report} setChoice={setChoice} />
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Upper-division psychology by subfield</h3>
          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
            {legend.map(([r, l]) => (
              <span key={r} className="inline-flex items-center gap-1">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${ROLE_STYLE[r]}`} /> {l}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <span className="rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">S</span> seminar
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {SUBFIELDS.map((s, i) => {
            const core = i < 3 ? find(report.nodes, `core-${s.key}`) : undefined
            const here = all.filter((e) => s.set.has(e.code))
            return (
              <div key={s.key} className="min-h-28 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{s.label}</span>
                  {core && <StatusIcon status={core.status} size={14} />}
                </div>
                <div className="text-[10px] text-zinc-400">{s.set.describe}</div>
                <div className="mt-1.5 flex flex-col gap-1">
                  {here.map((e) => {
                    const role = roles.get(e.id) ?? 'unused'
                    return (
                      <div key={e.id} className="flex items-center gap-1">
                        <span className={`h-4 w-1.5 shrink-0 rounded-sm ${ROLE_STYLE[role]}`} title={role} />
                        <CourseChip code={e.code} enrollment={e} kind={e.planned ? 'planned' : 'done'} onOpen={onOpenCourse} />
                        {seminarIds.has(e.id) && <span className="rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">S</span>}
                      </div>
                    )
                  })}
                  {core && core.status === 'unmet' && (
                    <span className="rounded border border-dashed border-zinc-300 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-700">needs one course</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {[additional, seminar, find(report.nodes, 'advanced-methods'), find(report.nodes, 'independent-study')].map(
            (n) =>
              n && (
                <span key={n.id} className="inline-flex items-center gap-1.5">
                  <StatusIcon status={n.status} size={14} /> {n.title}
                  {n.progress && n.progress.need > 1 && <span className="tabular-nums text-zinc-500">{n.progress.have}/{n.progress.need}</span>}
                  {n.status !== 'met' && <StatusPill status={n.status} />}
                </span>
              ),
          )}
        </div>
        {additional?.status !== 'met' && additional?.detail && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{additional.detail}</p>}
        <Quote quote={additional?.quote ?? []} />
      </Card>
      <NodeList report={report} nodes={rest} onOpen={onOpenCourse} setChoice={setChoice} setAttested={setAttested} />
      <Leftovers report={report} onOpen={onOpenCourse} />
    </div>
  )
}
