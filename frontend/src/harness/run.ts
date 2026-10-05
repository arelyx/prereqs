// Harness definition + runner.
//
// runHarness evaluates a harness twice — once over completed courses only,
// once including planned ones — and merges by node id: a node met only with
// planned courses is 'in-progress'. Then statuses roll up through groups.

import { HarnessContext, rollUp, worst } from './context'
import type { Node } from './context'
import type {
  AttestationDef,
  Catalog,
  ChoiceDef,
  ProgressReport,
  ReqNode,
  Status,
  StudentRecord,
} from './types'

export interface Harness {
  program: string
  edition: string
  title: string
  choices?: ChoiceDef[]
  attestations?: AttestationDef[]
  /** Catalog facts beyond the compact set: subjects whose descriptions are read. */
  catalogNeeds?: { descriptions?: string[] }
  /** Program-wide caveats shown at the top of the dashboard. */
  notes?: string[]
  /** Lint acknowledgements: source rows deliberately not referenced, unknown codes allowed — each with a reason. */
  coverage?: { ignore?: Record<string, string>; unknownOk?: Record<string, string> }
  evaluate(h: HarnessContext): Node[]
}

export function defineHarness(h: Harness): Harness {
  return h
}

function index(nodes: ReqNode[], out = new Map<string, ReqNode>()): Map<string, ReqNode> {
  for (const n of nodes) {
    out.set(n.id, n)
    if (n.children) index(n.children, out)
  }
  return out
}

function evalOnce(harness: Harness, student: StudentRecord, catalog: Catalog, includePlanned: boolean) {
  const h = new HarnessContext(student, catalog, harness.choices ?? [], harness.attestations ?? [], { includePlanned })
  const nodes = harness.evaluate(h)
  h.solve()
  return { h, nodes }
}

/** Statuses that a planned course could turn into met. */
const IMPROVABLE: Status[] = ['met']

export function runHarness(harness: Harness, student: StudentRecord, catalog: Catalog): ProgressReport {
  const hasPlanned =
    student.currentTerm != null && student.terms.some((t) => Number(t.term) >= Number(student.currentTerm))
  const all = evalOnce(harness, student, catalog, true)
  if (hasPlanned) {
    const done = evalOnce(harness, student, catalog, false)
    const doneIdx = index(done.nodes)
    // Leaf statuses: met with planned courses but not without → in-progress.
    const visit = (n: ReqNode) => {
      if (n.children?.length && (n as Node).combine) {
        n.children.forEach(visit)
        return
      }
      const d = doneIdx.get(n.id)
      if (IMPROVABLE.includes(n.status) && d && d.status !== 'met' && d.status !== 'info') {
        n.status = 'in-progress'
        n.detail = n.detail ?? 'Satisfied once your planned courses are completed.'
      }
    }
    all.nodes.forEach(visit)
  }
  for (const n of all.nodes) rollUp(n)
  const status = worst(all.nodes.map((n) => n.status))
  const usedIds = new Set<string>()
  const collect = (n: ReqNode) => {
    for (const e of n.used ?? []) usedIds.add(e.id)
    n.children?.forEach(collect)
  }
  all.nodes.forEach(collect)
  return {
    program: harness.program,
    edition: harness.edition,
    title: harness.title,
    status,
    nodes: all.nodes,
    unused: all.h.enrollments.filter((e) => !usedIds.has(e.id)),
    excluded: [...all.h.excluded.entries()].map(([id, reason]) => ({
      enrollment: all.h.enrollments.find((e) => e.id === id)!,
      reason,
    })),
    choices: (harness.choices ?? []).filter((c) => !c.when || c.when(all.h.choices)),
    activeChoices: all.h.choices,
    attestations: harness.attestations ?? [],
    attested: all.h.attestedRaw === 'all' ? (harness.attestations ?? []).map((a) => a.id) : (harness.attestations ?? []).filter((a) => all.h.attested(a.id)).map((a) => a.id),
    notes: harness.notes ?? [],
  }
}

/** Every unmet leaf, as "Group: Requirement" labels (for the eval adapter / summaries). */
export function unmetLabels(report: ProgressReport, statuses: Status[] = ['unmet', 'in-progress', 'needs-attestation']): string[] {
  const out: string[] = []
  const visit = (n: ReqNode, path: string[]) => {
    const here = [...path, n.title]
    if (n.children?.length && (n as Node).combine) {
      if ((n as Node).combine === 'any' && statuses.includes(n.status)) {
        out.push(`${here.join(': ')}${n.detail ? ` — ${n.detail}` : ''}`)
        return
      }
      n.children.forEach((c) => visit(c, here))
      return
    }
    if (statuses.includes(n.status)) out.push(`${here.join(': ')}${n.detail ? ` — ${n.detail}` : ''}`)
  }
  report.nodes.forEach((n) => visit(n, []))
  return out
}

/** Eval verdict: false if anything unmet; null if anything undecidable; else true. */
export function verdict(report: ProgressReport): { complete: boolean | null; unmet: string[]; note?: string } {
  const unmet = unmetLabels(report)
  if (unmet.length) return { complete: false, unmet }
  const open = unmetLabels(report, ['needs-choice', 'cannot-check'])
  if (open.length) return { complete: null, unmet: [], note: `undecidable: ${open.join('; ')}` }
  return { complete: true, unmet: [] }
}
