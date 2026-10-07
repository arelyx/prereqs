// Literature B.A. bespoke dashboard: the concentration choice reshapes the
// whole major, so it leads as three cards; the seven electives are shown as a
// distribution matrix (catalog tags × the electives that count), with the
// concentration's own column (language-of-concentration or LIT 179 workshops).
import { ChoiceControl, Leftovers, NodeList } from '@app/components/degree/DefaultReport'
import { Card, CourseChip, Quote, StatusIcon, StatusPill } from '@app/components/degree/ui'
import type { ViewProps } from '@harness/registry'
import type { Enrollment, ReqNode } from '@harness'

const CARDS = [
  {
    value: 'general',
    title: 'General Literature',
    blurb: 'Comparative reading across periods and traditions: basic proficiency in a second language plus 12 literature courses.',
  },
  {
    value: 'language',
    title: 'Language Literature',
    blurb: 'Literature read in the original language — five of your electives in one language of concentration; two years of language.',
  },
  {
    value: 'creative-writing',
    title: 'Creative Writing',
    blurb: 'Workshops from introductory to advanced; three LIT 179 workshops and a creative senior seminar. Admission is selective.',
  },
]
const TAGS = [
  { tag: 'Pre-1750', need: 2 },
  { tag: 'Global', need: 1 },
  { tag: 'Poetry', need: 1 },
  { tag: 'Research', need: 1 },
]

function find(nodes: ReqNode[], id: string): ReqNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const k = n.children && find(n.children, id)
    if (k) return k
  }
  return undefined
}

/** Copy of the tree without the nodes the matrix already shows. */
function without(nodes: ReqNode[], ids: Set<string>): ReqNode[] {
  return nodes
    .filter((n) => !ids.has(n.id))
    .map((n) => (n.children ? { ...n, children: without(n.children, ids) } : n))
    .filter((n) => !n.children || n.children.length > 0) // drop groups the matrix emptied
}

export default function LiteratureView({ report, onOpenCourse, setChoice, setAttested }: ViewProps) {
  const conc = report.activeChoices.concentration
  const def = (k: string) => report.choices.find((c) => c.key === k)
  const electives = find(report.nodes, 'electives')
  const dist = TAGS.map((t) => ({ ...t, node: find(report.nodes, `dist/${t.tag}`) }))
  const lang = find(report.nodes, 'language-five')
  const cw = find(report.nodes, 'cw-advanced')
  const extra = lang ?? cw
  const extraUsed = new Set((extra?.used ?? []).map((e) => e.id))
  // Tags per counted elective, as the harness read them from catalog descriptions.
  const tagMap = (electives?.data?.tags ?? {}) as Record<string, string[]>
  const tagsOf = (e: Enrollment) => tagMap[e.id] ?? []
  const rows = electives?.used ?? []

  return (
    <div className="space-y-3">
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Concentration</h3>
          {!conc && <StatusPill status="needs-choice" label="Choose one to see your requirements" />}
        </div>
        <div role="radiogroup" aria-label="Concentration" className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          {CARDS.map((c) => {
            const on = conc === c.value
            return (
              <button
                key={c.value}
                role="radio"
                aria-checked={on}
                onClick={() => setChoice('concentration', on ? null : c.value)}
                className={`rounded-lg border p-3 text-left transition ${
                  on
                    ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500 dark:border-violet-400 dark:bg-violet-950/40'
                    : 'border-zinc-200 hover:border-violet-300 dark:border-zinc-800 dark:hover:border-violet-700'
                }`}
              >
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{c.title}</div>
                <p className="mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">{c.blurb}</p>
              </button>
            )
          })}
        </div>
        {conc && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            {['language', 'ancient_language', 'track', 'intensive'].map((k) => {
              const d = def(k)
              if (!d) return null
              return (
                <label key={k} className="flex flex-wrap items-center gap-2">
                  <span className={`font-semibold ${report.activeChoices[k] ? '' : 'text-violet-700 dark:text-violet-300'}`}>{d.label}</span>
                  <ChoiceControl def={d} value={report.activeChoices[k]} onChange={(v) => setChoice(k, v)} />
                </label>
              )
            })}
          </div>
        )}
      </Card>

      {conc && electives && (
        <Card className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <StatusIcon status={electives.status} /> Your seven electives and the distribution areas
            </h3>
            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {electives.progress?.have ?? 0}/7 electives
            </span>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="py-1 pr-2 font-semibold">Elective</th>
                  {TAGS.map((t) => (
                    <th key={t.tag} className="px-1 py-1 text-center font-semibold">
                      {t.tag}
                      {t.need > 1 ? ` ×${t.need}` : ''}
                    </th>
                  ))}
                  {extra && <th className="px-1 py-1 text-center font-semibold">{lang ? 'In language' : 'LIT 179'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((e) => {
                  const tags = tagsOf(e)
                  return (
                    <tr key={e.id}>
                      <td className="py-1 pr-2">
                        <CourseChip code={e.code} enrollment={e} kind={e.planned ? 'planned' : 'done'} onOpen={onOpenCourse} />
                      </td>
                      {TAGS.map((t) => (
                        <td key={t.tag} className="px-1 text-center">
                          {tags.includes(t.tag) ? <span className="font-bold text-emerald-600 dark:text-emerald-400">●</span> : <span className="text-zinc-300 dark:text-zinc-700">·</span>}
                        </td>
                      ))}
                      {extra && (
                        <td className="px-1 text-center">
                          {extraUsed.has(e.id) ? <span className="font-bold text-emerald-600 dark:text-emerald-400">●</span> : <span className="text-zinc-300 dark:text-zinc-700">·</span>}
                        </td>
                      )}
                    </tr>
                  )
                })}
                {Array.from({ length: Math.max(0, 7 - rows.length) }).map((_, i) => (
                  <tr key={`empty${i}`}>
                    <td className="py-1.5 pr-2 text-zinc-400" colSpan={TAGS.length + (extra ? 2 : 1)}>
                      <span className="rounded border border-dashed border-zinc-300 px-2 py-0.5 dark:border-zinc-700">open elective slot</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 dark:border-zinc-700">
                  <td className="py-1.5 pr-2 font-semibold text-zinc-600 dark:text-zinc-300">Covered</td>
                  {dist.map((d) => (
                    <td key={d.tag} className="px-1 text-center">
                      {d.node ? <StatusPill status={d.node.status} label={`${d.node.progress?.have ?? 0}/${d.need}`} /> : null}
                    </td>
                  ))}
                  {extra && (
                    <td className="px-1 text-center">
                      <StatusPill status={extra.status} label={`${extra.progress?.have ?? 0}/${extra.progress?.need ?? 0}`} />
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
          {[...dist.map((d) => d.node), extra, electives].map(
            (n) =>
              n &&
              n.status !== 'met' &&
              n.detail && (
                <p key={n.id} className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <b>{n.title}:</b> {n.detail}
                </p>
              ),
          )}
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Distribution areas come from each course’s catalog description; one course may cover several. {electives.pool ? `Electives: ${electives.pool}.` : ''}
          </p>
          <Quote quote={electives.quote} />
        </Card>
      )}

      {conc && (
        <NodeList
          report={report}
          nodes={without(report.nodes, new Set(['distribution', 'electives', 'language-five', 'cw-advanced']))}
          onOpen={onOpenCourse}
          setChoice={setChoice}
          setAttested={setAttested}
        />
      )}
      <Leftovers report={report} onOpen={onOpenCourse} />
    </div>
  )
}
