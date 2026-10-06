import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'AM 10', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'CSE 12', 'AM 20', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'CSE 13S', 'AM 30', 'CSE 101'],
  ['2280', 'CSE 150', 'CSE 185E', 'CSE 130'],
  ['2282', 'CSE 156', 'CSE 156L', 'CSE 183'],
  ['2288', 'CSE 180', 'CSE 118'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('network-and-digital-technology-ba 2026-27', () => {
  it('complete record is met (CSE 156/156L is an elective and the comprehensive course)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('five electives are required', () => {
    expect(failing(run(harness, { terms: swap('CSE 118', []) }))).toEqual(['electives:unmet'])
  })

  it('CSE 115A (a DC course) is not an elective, but satisfies the comprehensive requirement', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 115A']) }), 'electives').status).toBe('unmet')
    const t = swap('CSE 156', ['CSE 115A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 156L' ? 'CSE 117' : c === 'CSE 183' ? 'CSE 119' : c)) }))
    const r = run(harness, { terms: t })
    expect(failing(r)).toEqual([])
    expect(find(r, 'comp-course').used?.map((e) => e.display)).toEqual(['CSE 115A'])
  })

  it('no credit for both CSE 180 and CSE 182', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 182']) }), 'electives').status).toBe('unmet')
  })

  it('an elective with an associated lab needs the lab', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 151']) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 151', 'CSE 151L']) }), 'electives').status).toBe('met')
  })

  it('graduate 201–279 counts; 280–289 does not', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 210A']) }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 280A']) }), 'electives').status).toBe('unmet')
  })

  it('a non-CSE upper-division course might be on the external approved list: cannot-check', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['ECE 171']) }), 'electives').status).toBe('cannot-check')
  })

  it('no comprehensive course: needs the petition, else unmet', () => {
    // CSE 156/156L and CSE 183 → CSE 130-like electives not on the comprehensive list
    const t = swap('CSE 156', ['CSE 117']).map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 156L' ? [] : c === 'CSE 183' ? ['CSE 119'] : [c])) }))
    const r = run(harness, { terms: t, attested: [] })
    expect(find(r, 'comprehensive').status).toBe('needs-attestation')
    expect(find(r, 'comp-course').status).toBe('unmet')
  })

  it('ECE 101 + 101L alternative to CSE 101', () => {
    expect(failing(run(harness, { terms: swap('CSE 101', ['ECE 101', 'ECE 101L']) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CSE 101', ['ECE 101']) }))).toEqual(['algo-or-circuits:unmet'])
  })

  it('CSE 185E is required (and is the DC course)', () => {
    const r = run(harness, { terms: swap('CSE 185E', []) })
    expect(failing(r)).toEqual(['cse185:unmet', 'dc:unmet'])
  })

  it('PHYS 6A/6L and 15C alternatives; lab required with lecture', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.map((c) => ({ 'PHYS 5A': 'PHYS 6A', 'PHYS 5L': 'PHYS 6L', 'PHYS 5C': 'PHYS 15C' })[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: swap('PHYS 5L', []) }))).toEqual(['phys-a:unmet'])
  })

  it('CSE 20 missing but CSE 30 passed is cannot-check', () => {
    expect(failing(run(harness, { terms: swap('CSE 20', []) }))).toEqual(['cse20:cannot-check'])
  })

  it('letter grades required', () => {
    expect(find(run(harness, { terms: base, grades: { 'CSE 150': 'P' } }), 'cse150').status).toBe('unmet')
  })
})
