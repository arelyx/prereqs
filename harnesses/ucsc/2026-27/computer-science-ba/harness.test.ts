import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'AM 10'],
  ['2272', 'CSE 12', 'CSE 40'],
  ['2278', 'CSE 101P', 'CSE 102'],
  ['2280', 'CSE 120', 'CSE 140'],
  ['2282', 'CSE 183', 'MATH 110', 'LING 112'],
  ['2288', 'CSE 115A'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('computer-science-ba 2026-27', () => {
  it('complete record is met (CSE 140 is breadth and capstone at once)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('electives need at least one upper-division CSE 100–189 or CSE 195', () => {
    const t = swap('CSE 183', ['ECON 101'])
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 183', ['CSE 195']) }), 'electives').status).toBe('met')
  })

  it('the DC course cannot also be an elective', () => {
    // CSE 115A is used for DC; without CSE 183 there are only two electives
    const t = swap('CSE 183', [])
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    // a second DC-list course can be an elective
    expect(find(run(harness, { terms: swap('CSE 183', ['CSE 185E']) }), 'electives').status).toBe('met')
  })

  it('a lecture with a lab counts only with its lab (ENVS 115A needs 115L)', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['ENVS 115A']) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('LING 112', ['ENVS 115A', 'ENVS 115L']) }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('LING 112', ['MATH 148']) }), 'electives').status).toBe('unmet')
  })

  it('a lab alone is not an elective', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['CSE 100L']) }), 'electives').status).toBe('unmet')
  })

  it('a course outside the list is not an elective', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['ECON 113']) }), 'electives').status).toBe('unmet')
  })

  it('breadth needs three courses from the breadth lists', () => {
    const t = swap('CSE 120', ['MATH 115']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 183' ? 'CSE 185E' : c)) }))
    const r = run(harness, { terms: t })
    expect(find(r, 'breadth').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('CSE 101 alternative to CSE 101P; second breadth list counts', () => {
    expect(failing(run(harness, { terms: swap('CSE 101P', ['CSE 101']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 120' ? 'CSE 130' : c)) })) }))).toEqual([])
  })

  it('no capstone and no thesis fails the comprehensive requirement', () => {
    // CSE 140 → CSE 142 (breadth, not a capstone); CSE 183 → CSE 118 (not a capstone)
    const t = swap('CSE 140', ['CSE 142']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 183' ? 'CSE 118' : c)) }))
    const r = run(harness, { terms: t })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(failing(r)).toEqual(['capstone:unmet', 'thesis:unmet'])
  })

  it('senior thesis: CSE 195 used for DC and thesis at once is flagged', () => {
    const t = swap('CSE 140', ['CSE 142']).map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 183' ? ['CSE 118'] : c === 'CSE 115A' ? ['CSE 195'] : [c])) }))
    expect(find(run(harness, { terms: t }), 'thesis').status).toBe('cannot-check')
  })

  it('CSE 40 test-out is an attestation alternative', () => {
    const t = swap('CSE 40', [])
    expect(find(run(harness, { terms: t, attested: [] }), 'cse40-or-testout').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t }), 'cse40-or-testout').status).toBe('met')
  })

  it('CSE 20 missing but CSE 30 passed is cannot-check', () => {
    expect(failing(run(harness, { terms: swap('CSE 20', []) }))).toEqual(['cse20:cannot-check'])
  })

  it('MATH 20A/20B option; mixed packages do not count', () => {
    const t = swap('MATH 19A', ['MATH 20A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MATH 19B' ? 'MATH 20B' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: swap('MATH 19A', ['MATH 20A']) }))).toEqual(['calc:unmet'])
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'MATH 110': 'P' } }), 'electives').status).toBe('unmet')
  })
})
