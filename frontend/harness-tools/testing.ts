// Test helpers for harness.test.ts files.
import { runHarness } from '@harness'
import type { Harness, ProgressReport, ReqNode, StudentRecord } from '@harness'
import { loadCatalog } from './catalog'

/** Quarters helper: plan(['2268', 'CSE 20', 'MATH 19A'], ['2270', 'CSE 30']) */
export function plan(...terms: [string, ...string[]][]): StudentRecord['terms'] {
  return terms.map(([term, ...courses]) => ({ term, courses }))
}

export function run(h: Harness, student: Partial<StudentRecord> & { terms: StudentRecord['terms'] }): ProgressReport {
  return runHarness(h, { attested: 'all', ...student }, loadCatalog())
}

export function find(report: ProgressReport, id: string): ReqNode {
  const stack = [...report.nodes]
  while (stack.length) {
    const n = stack.shift()!
    if (n.id === id) return n
    stack.push(...(n.children ?? []))
  }
  throw new Error(`no node ${id}; have: ${ids(report).join(', ')}`)
}

export function ids(report: ProgressReport): string[] {
  const out: string[] = []
  const visit = (n: ReqNode) => {
    out.push(n.id)
    n.children?.forEach(visit)
  }
  report.nodes.forEach(visit)
  return out
}

/** Leaves that are not met/info — compact summary for assertions. */
export function failing(report: ProgressReport): string[] {
  const out: string[] = []
  const visit = (n: ReqNode) => {
    if (n.children?.length) return n.children.forEach(visit)
    if (n.status !== 'met' && n.status !== 'info') out.push(`${n.id}:${n.status}`)
  }
  report.nodes.forEach(visit)
  return out
}
