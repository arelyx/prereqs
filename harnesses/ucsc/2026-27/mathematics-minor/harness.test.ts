import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'MATH 21'],
  ['2270', 'MATH 19B', 'MATH 23A'],
  ['2272', 'MATH 23B', 'MATH 100'],
  ['2278', 'MATH 105A', 'MATH 110'],
  ['2280', 'MATH 115', 'AM 114'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('mathematics-minor 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('both MATH 23A and MATH 23B are required (no AM 30 option in the minor)', () => {
    expect(find(run(harness, { terms: swap('MATH 23B', 'AM 30') }), 'vector-calc').status).toBe('unmet')
  })

  it('only one elective may be AM or STAT', () => {
    expect(find(run(harness, { terms: swap('MATH 115', 'STAT 131') }), 'electives').status).toBe('unmet')
  })

  it('a STAT course alone as the one non-MATH elective is fine', () => {
    expect(failing(run(harness, { terms: swap('AM 114', 'STAT 131') }))).toEqual([])
  })

  it('courses must be numbered 101–190: MATH 194/199 and graduate AM do not count', () => {
    expect(find(run(harness, { terms: swap('MATH 115', 'MATH 194') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('AM 114', 'AM 212A') }), 'electives').status).toBe('unmet')
  })

  it('courses under 5 credits do not count; a lab is absorbed into its lecture', () => {
    expect(find(run(harness, { terms: swap('MATH 115', 'MATH 103B') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 115', 'MATH 148', 'MATH 148L') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('MATH 115', 'MATH 148L') }), 'electives').status).toBe('unmet')
  })

  it('MATH 100 cannot double as an elective', () => {
    expect(find(run(harness, { terms: swap('MATH 105A') }), 'electives').status).toBe('unmet')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'MATH 110': 'P' } }))).toEqual([])
  })

  it('AM 10 for linear algebra, honors calculus', () => {
    const t = swap('MATH 21', 'AM 10').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 19A' ? 'MATH 20A' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('MATH 111A and MATH 111T: credit for only one', () => {
    const t = swap('MATH 110', 'MATH 111A').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 115' ? 'MATH 111T' : c)) }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })
})
