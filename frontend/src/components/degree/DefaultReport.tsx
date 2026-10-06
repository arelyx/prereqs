// The default degree-progress renderer for any ProgressReport. Bespoke
// harness Views reuse its pieces (Summary, ChoiceBar, NodeList, Leftovers).
import { useState } from 'react'
import type { ChoiceDef, ProgressReport, ReqNode } from '../../harness/types'
import type { ViewProps } from '../../harness/registry'
import { termLabel } from '../../harness/terms'
import { Bar, Card, CourseChip, Quote, STATUS, StatusIcon, StatusPill, countLeaves } from './ui'
import { useStore } from '../../store'

type N = ReqNode & { combine?: 'all' | 'any'; flat?: boolean; packages?: string[][] }

export function Summary({ report }: { report: ProgressReport }) {
  const c = countLeaves(report.nodes)
  const total = c.met + c['in-progress'] + c.unmet + c['needs-choice'] + c['needs-attestation'] + c['cannot-check']
  const seg = (n: number, cls: string, label: string) =>
    n > 0 ? <div className={cls} style={{ width: `${(n / Math.max(total, 1)) * 100}%` }} title={`${n} ${label}`} /> : null
  const items: [number, keyof typeof STATUS, string][] = [
    [c.met, 'met', 'done'],
    [c['in-progress'], 'in-progress', 'planned'],
    [c.unmet, 'unmet', 'to do'],
    [c['needs-choice'], 'needs-choice', 'to decide'],
    [c['needs-attestation'], 'needs-attestation', 'to confirm'],
    [c['cannot-check'], 'cannot-check', 'check yourself'],
  ]
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-label="degree progress">
        {seg(c.met, 'bg-emerald-500', 'done')}
        {seg(c['in-progress'], 'bg-sky-500', 'planned')}
        {seg(c['needs-attestation'] + c['needs-choice'], 'bg-amber-400', 'need your input')}
        {seg(c['cannot-check'], 'bg-orange-400', 'check yourself')}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {items
          .filter(([n]) => n > 0)
          .map(([n, s, label]) => (
            <span key={s} className={`inline-flex items-center gap-1 ${STATUS[s].text}`}>
              <StatusIcon status={s} size={13} />
              <b>{n}</b> {label}
            </span>
          ))}
        <span className="text-zinc-400">of {total} requirements</span>
      </div>
    </div>
  )
}

export function ChoiceControl({
  def,
  value,
  onChange,
  suggestions,
}: {
  def: ChoiceDef
  value: string | undefined
  onChange: (v: string | null) => void
  /** For free course-code choices: the student's candidate courses. */
  suggestions?: string[]
}) {
  const store = useStore()
  if (def.free && def.input !== 'term' && suggestions) {
    const opts = [...new Set([...(value ? [value] : []), ...suggestions])]
    return (
      <select
        aria-label={def.label}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Pick the course that covers this…</option>
        {opts.map((c) => (
          <option key={c} value={c}>
            {c.replace(/^([A-Z]+)/, '$1 ')}
          </option>
        ))}
      </select>
    )
  }
  if (def.free && def.input === 'term') {
    const terms = store.content.terms.map((t) => t.term_code).sort()
    return (
      <select
        aria-label={def.label}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Assume from my plan</option>
        {terms.map((t) => (
          <option key={t} value={t}>
            {termLabel(t)}
          </option>
        ))}
      </select>
    )
  }
  if (def.free) {
    return (
      <input
        aria-label={def.label}
        className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="e.g. ANTH 130"
        defaultValue={value ?? ''}
        onBlur={(e) => onChange(e.target.value.trim() || null)}
      />
    )
  }
  if (def.options.length <= 4) {
    return (
      <div role="radiogroup" aria-label={def.label} className="inline-flex flex-wrap gap-1">
        {def.options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              value === o.value
                ? 'border-violet-500 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-500'
                : 'border-zinc-300 bg-white text-zinc-700 hover:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    )
  }
  return (
    <select
      aria-label={def.label}
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Choose…</option>
      {def.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function ChoiceBar({ report, setChoice, skip = [] }: { report: ProgressReport; setChoice: ViewProps['setChoice']; skip?: string[] }) {
  // Free course-code choices are asked inline, next to the requirement they serve.
  const defs = report.choices.filter((c) => !skip.includes(c.key) && (!c.free || c.input === 'term'))
  if (!defs.length) return null
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60">
      {defs.map((d) => (
        <label key={d.key} className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span className={`font-semibold ${report.activeChoices[d.key] ? '' : 'text-violet-700 dark:text-violet-300'}`}>{d.label}</span>
          <ChoiceControl def={d} value={report.activeChoices[d.key]} onChange={(v) => setChoice(d.key, v)} />
        </label>
      ))}
    </div>
  )
}

function Chips({ node, onOpen }: { node: N; onOpen: (c: string) => void }) {
  const [more, setMore] = useState(false)
  const used = node.used ?? []
  const usedCodes = new Set(used.map((e) => e.code))
  const opts = (node.options ?? []).filter((c) => !usedCodes.has(c))
  const showOptions = node.status !== 'met' && node.status !== 'info'
  const LIMIT = 10
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {used.map((e) => (
        <CourseChip key={e.id} code={e.code} enrollment={e} kind={e.planned ? 'planned' : 'done'} onOpen={onOpen} />
      ))}
      {showOptions && opts.length > 0 && (
        <>
          {used.length > 0 && <span className="px-0.5 text-[11px] text-zinc-400">·</span>}
          {(more ? opts : opts.slice(0, LIMIT)).map((c) => (
            <CourseChip key={c} code={c} kind="option" onOpen={onOpen} />
          ))}
          {opts.length > LIMIT && (
            <button className="text-[11px] text-sky-700 hover:underline dark:text-sky-400" onClick={() => setMore(!more)}>
              {more ? 'fewer' : `+${opts.length - LIMIT} more`}
            </button>
          )}
        </>
      )}
      {showOptions && node.pool && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">from: {node.pool}</span>}
    </div>
  )
}

function Leaf({ node, onOpen, setAttested, setChoice, report }: { node: N; onOpen: (c: string) => void; report: ProgressReport } & Pick<ViewProps, 'setAttested' | 'setChoice'>) {
  const p = node.progress
  const choiceDef = node.choice ? report.choices.find((c) => c.key === node.choice) : undefined
  return (
    <div className="flex gap-2.5 py-2" data-node={node.id}>
      <div className="pt-0.5">
        <StatusIcon status={node.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{node.title}</span>
          <span className="flex items-center gap-2">
            {p && p.need > 1 && (
              <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {p.have}/{p.need}
                {p.unit ? ` ${p.unit}` : ''}
              </span>
            )}
            {node.status !== 'met' && node.status !== 'info' && <StatusPill status={node.status} />}
          </span>
        </div>
        {p && p.need > 1 && <Bar have={p.have} need={p.need} status={node.status} className="mt-1 max-w-xs" />}
        {node.detail && node.status !== 'met' && <p className={`mt-0.5 text-xs ${STATUS[node.status].text}`}>{node.detail}</p>}
        {node.detail && node.status === 'met' && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{node.detail}</p>}
        {!(choiceDef?.free && choiceDef.input !== 'term') && <Chips node={node} onOpen={onOpen} />}
        {choiceDef?.free && choiceDef.input !== 'term' && node.used?.length ? <Chips node={{ ...node, options: [] }} onOpen={onOpen} /> : null}
        {node.attest && (
          <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <input
              type="checkbox"
              checked={node.status === 'met'}
              onChange={(e) => setAttested(node.attest!.id, e.target.checked)}
              aria-label={`I confirm: ${node.attest.label}`}
            />
            I confirm this is done
          </label>
        )}
        {choiceDef && (
          <div className="mt-1.5">
            <ChoiceControl def={choiceDef} value={report.activeChoices[choiceDef.key]} onChange={(v) => setChoice(choiceDef.key, v)} suggestions={node.options} />
          </div>
        )}
        {node.notes?.map((n, i) => (
          <p key={i} className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            ⓘ {n}
          </p>
        ))}
        <Quote quote={node.quote} />
      </div>
    </div>
  )
}

/** "All of these" lists rendered as one checklist row of course chips. */
function FlatList({ node, onOpen }: { node: N; onOpen: (c: string) => void }) {
  const kids = node.children ?? []
  const done = kids.filter((k) => k.status === 'met').length
  return (
    <div className="flex gap-2.5 py-2" data-node={node.id}>
      <div className="pt-0.5">
        <StatusIcon status={node.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{node.title}</span>
          <span className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {done}/{kids.length}
            </span>
            {node.status !== 'met' && <StatusPill status={node.status} />}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {kids.map((k) => {
            const e = k.used?.[0]
            const code = e?.code ?? k.options?.[0] ?? k.title
            return (
              <CourseChip
                key={k.id}
                code={code}
                enrollment={e}
                kind={k.status === 'met' ? 'done' : k.status === 'in-progress' ? 'planned' : 'missing'}
                onOpen={onOpen}
              />
            )
          })}
        </div>
        {kids
          .filter((k) => k.status !== 'met' && k.status !== 'in-progress' && k.detail && !/more needed/.test(k.detail))
          .map((k) => (
            <p key={k.id} className={`mt-0.5 text-xs ${STATUS[k.status].text}`}>
              {k.title}: {k.detail}
            </p>
          ))}
        <Quote quote={node.quote} />
      </div>
    </div>
  )
}

function Either({ node, ...rest }: { node: N; onOpen: (c: string) => void; report: ProgressReport } & Pick<ViewProps, 'setAttested' | 'setChoice'>) {
  const [showAll, setShowAll] = useState(false)
  const kids = node.children ?? []
  const chosen = node.status === 'met' || node.status === 'in-progress' ? kids.find((k) => k.status === node.status) : undefined
  const visible = chosen && !showAll ? [chosen] : kids
  return (
    <div className="py-1.5" data-node={node.id}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <StatusIcon status={node.status} /> {node.title}
        </span>
        {node.status !== 'met' && <StatusPill status={node.status} />}
      </div>
      <div className="ml-7 mt-1 rounded-md border border-dashed border-zinc-300 px-3 dark:border-zinc-700">
        <p className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {chosen && !showAll ? 'Satisfied by' : 'Any one of these'}
        </p>
        {visible.map((k, i) => (
          <div key={k.id} className={i > 0 ? 'border-t border-zinc-100 dark:border-zinc-800' : ''}>
            <NodeView node={k} {...rest} />
          </div>
        ))}
        {chosen && kids.length > 1 && (
          <button className="pb-1.5 text-[11px] text-sky-700 hover:underline dark:text-sky-400" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'hide other options' : `show ${kids.length - 1} other option${kids.length > 2 ? 's' : ''}`}
          </button>
        )}
      </div>
      <div className="ml-7">
        <Quote quote={node.quote} />
      </div>
    </div>
  )
}

export function NodeView(props: { node: N; onOpen: (c: string) => void; report: ProgressReport } & Pick<ViewProps, 'setAttested' | 'setChoice'>) {
  const { node } = props
  if (node.children?.length && node.combine) {
    if (node.flat) return <FlatList node={node} onOpen={props.onOpen} />
    if (node.combine === 'any') return <Either {...props} />
    return (
      <div className="py-1" data-node={node.id}>
        <div className="mt-1 flex items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{node.title}</h4>
          {node.progress && (
            <span className="text-[11px] tabular-nums text-zinc-400">
              {node.progress.have}/{node.progress.need}
            </span>
          )}
        </div>
        {node.detail && <p className="text-xs text-zinc-500 dark:text-zinc-400">{node.detail}</p>}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {node.children.map((k) => (
            <NodeView key={k.id} {...props} node={k} />
          ))}
        </div>
      </div>
    )
  }
  return <Leaf {...props} node={node} />
}

/** One top-level requirement block as a card. */
export function Section(props: { node: N; onOpen: (c: string) => void; report: ProgressReport } & Pick<ViewProps, 'setAttested' | 'setChoice'>) {
  const { node } = props
  const isGroup = !!(node.children?.length && node.combine === 'all' && !node.flat)
  const c = isGroup ? countLeaves(node.children!) : null
  const done = c ? c.met : 0
  const total = c ? Object.entries(c).filter(([k]) => k !== 'info').reduce((a, [, v]) => a + v, 0) : 0
  return (
    <Card className="px-4 py-3">
      {isGroup ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <StatusIcon status={node.status} /> {node.title}
            </h3>
            <span className="flex items-center gap-2 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {done}/{total}
              <StatusPill status={node.status} />
            </span>
          </div>
          {node.detail && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{node.detail}</p>}
          <div className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">
            {node.children!.map((k) => (
              <NodeView key={k.id} {...props} node={k} />
            ))}
          </div>
        </>
      ) : (
        <NodeView {...props} />
      )}
    </Card>
  )
}

export function NodeList({ report, nodes, ...rest }: { report: ProgressReport; nodes?: ReqNode[]; onOpen: (c: string) => void } & Pick<ViewProps, 'setAttested' | 'setChoice'>) {
  return (
    <div className="space-y-3">
      {(nodes ?? report.nodes).map((n) => (
        <Section key={n.id} node={n as N} report={report} {...rest} />
      ))}
    </div>
  )
}

/** Courses the program could not use, and grade-policy exclusions. */
export function Leftovers({ report, onOpen }: { report: ProgressReport; onOpen: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const excludedIds = new Set(report.excluded.map((x) => x.enrollment.id))
  const unused = report.unused.filter((e) => !excludedIds.has(e.id))
  if (!report.excluded.length && !unused.length) return null
  return (
    <div className="space-y-2 text-xs">
      {report.excluded.length > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-semibold">Not counted because of a grade rule</p>
          <ul className="mt-1 space-y-0.5">
            {report.excluded.map((x) => (
              <li key={x.enrollment.id} className="flex flex-wrap items-center gap-2">
                <CourseChip code={x.enrollment.code} enrollment={x.enrollment} kind="excluded" onOpen={onOpen} />
                <span>{x.reason.replace(/^[A-Z]+ \S+: /, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {unused.length > 0 && (
        <div>
          <button className="text-zinc-500 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-300" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? '▾' : '▸'} {unused.length} course{unused.length > 1 ? 's' : ''} in your plan not used by this program
          </button>
          {open && (
            <div className="mt-1 flex flex-wrap gap-1">
              {unused.map((e) => (
                <CourseChip key={e.id} code={e.code} enrollment={e} kind="missing" onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** The whole default dashboard body (used when a harness has no View). */
export default function DefaultReport({ report, onOpenCourse, setChoice, setAttested }: ViewProps) {
  return (
    <div className="space-y-3">
      <ChoiceBar report={report} setChoice={setChoice} />
      <NodeList report={report} onOpen={onOpenCourse} setChoice={setChoice} setAttested={setAttested} />
      <Leftovers report={report} onOpen={onOpenCourse} />
    </div>
  )
}
