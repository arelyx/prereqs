import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'CSE 12', 'AM 20', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'CSE 13S', 'CSE 100', 'CSE 100L'],
  ['2280', 'CSE 101', 'ECE 101', 'ECE 101L'],
  ['2282', 'CSE 120', 'CSE 121'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('computer-engineering-minor 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('PHYS 6A + 6L and 6C + 6N are alternative lecture/lab combinations', () => {
    let t = swap('PHYS 5A', ['PHYS 6A'])
    t = t.map((q) => ({ ...q, courses: q.courses.map((c) => ({ 'PHYS 5L': 'PHYS 6L', 'PHYS 5C': 'PHYS 6C', 'PHYS 5N': 'PHYS 6N' })[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('mixing PHYS 5A with PHYS 6L does not complete a combination', () => {
    expect(failing(run(harness, { terms: swap('PHYS 5L', ['PHYS 6L']) }))).toEqual(['phys-a:unmet'])
  })

  it('a lecture without its lab fails', () => {
    expect(failing(run(harness, { terms: swap('PHYS 5N', []) }))).toEqual(['phys-c:unmet'])
  })

  it('ECE 118 may replace CSE 121', () => {
    expect(failing(run(harness, { terms: swap('CSE 121', ['ECE 118']) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CSE 121', []) }))).toEqual(['embedded:unmet'])
  })

  it('ECE 13 counts for C programming; ODE via MATH 24', () => {
    const t = swap('CSE 13S', ['ECE 13']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'AM 20' ? 'MATH 24' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('CSE 20 test-out: offered only when CSE 20 is absent; attested ⇒ met by test-out', () => {
    const noCse20 = swap('CSE 20', [])
    const r = run(harness, { terms: noCse20 })
    expect(failing(r)).toEqual([])
    expect(find(r, 'cse20').detail).toMatch(/test-out/)
    const r2 = run(harness, { terms: noCse20, attested: [] })
    expect(failing(r2)).toEqual(['cse20:needs-attestation'])
    expect(find(r2, 'cse20').attest?.id).toBe('cse20-testout')
    // CSE 20 in the plan: no attestation asked.
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual([])
  })

  it('review: a failed CSE 20 is not rescued by the test-out attestation', () => {
    expect(failing(run(harness, { terms: base, grades: { 'CSE 20': 'F' } }))).toEqual(['cse20:unmet'])
  })

  it('AP credit recorded as completed CSE 20 counts', () => {
    expect(failing(run(harness, { terms: swap('CSE 20', []), completed: ['CSE 20'] }))).toEqual([])
  })

  it('review: failing or NP grades do not count; ECE 13 + CSE 13S together still complete', () => {
    expect(failing(run(harness, { terms: base, grades: { 'CSE 12': 'F' } }))).toEqual(['cse12:unmet'])
    expect(failing(run(harness, { terms: base, grades: { 'CSE 101': 'NP' } }))).toEqual(['core-ud2/CSE101:unmet'])
    expect(failing(run(harness, { terms: swap('CSE 13S', ['ECE 13']) }))).toEqual([])
  })

  it('review: PHYS 15A is not listed on this page as a PHYS 5A substitute', () => {
    expect(failing(run(harness, { terms: swap('PHYS 5A', ['PHYS 15A']) }))).toEqual(['phys-a:unmet'])
  })

  it('P/NP is accepted; missing ECE 101L fails', () => {
    expect(failing(run(harness, { terms: base, grades: { 'CSE 120': 'P' } }))).toEqual([])
    expect(failing(run(harness, { terms: swap('ECE 101L', []) }))).toEqual(['core-ud2/ECE101L:unmet'])
  })
})
