import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'ECON 1', 'MATH 19A'],
  ['2270', 'ECON 2', 'MATH 19B'],
  ['2272', 'MATH 21', 'MATH 22', 'STAT 17', 'STAT 17L'],
  ['2278', 'ECON 100A', 'MATH 100'],
  ['2280', 'ECON 100B', 'MATH 105A'],
  ['2282', 'ECON 113', 'ECON 120', 'ECON 104'],
  ['2288', 'ECON 135', 'MATH 105B', 'STAT 131'],
  ['2290', 'MATH 117'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('economicsmathematics-combined-ba 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
  })

  it('MATH 23A + 23B is an accepted option (with a caveat note)', () => {
    const r = run(harness, { terms: swap('MATH 22', 'MATH 23A', 'MATH 23B'), attested: [] })
    expect(find(r, 'multivar').status).toBe('met')
    expect(find(r, 'multivar').notes?.join(' ')).toMatch(/petition/)
  })

  it('MATH 23A alone does not complete the option', () => {
    expect(find(run(harness, { terms: swap('MATH 22', 'MATH 23A') }), 'multivar').status).toBe('unmet')
  })

  it('DC option 2 reuses MATH 100', () => {
    const r = run(harness, { terms: swap('ECON 104', 'MATH 194') })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'math-ud').status).toBe('met')
  })

  it('DC fails without ECON 104/197 or MATH 194/195', () => {
    expect(find(run(harness, { terms: swap('ECON 104') }), 'dc').status).toBe('unmet')
  })

  it('MATH 145 + 145L count as one math elective', () => {
    const r = run(harness, { terms: swap('MATH 117', 'MATH 145', 'MATH 145L') })
    expect(find(r, 'math-electives').status).toBe('met')
    const labOnly = run(harness, { terms: swap('MATH 117', 'MATH 145L') })
    expect(find(labOnly, 'math-electives').status).toBe('unmet')
  })

  it('economics elective must be on the combined-major list', () => {
    // ECON 105 is a B.A. general elective but not on this list
    expect(find(run(harness, { terms: swap('ECON 120', 'ECON 105') }), 'econ-electives').status).toBe('unmet')
  })

  it('comprehensive needs C or better', () => {
    const r = run(harness, { terms: base, grades: { 'ECON 100B': 'D+' } })
    expect(find(r, 'macro').status).toBe('met')
    expect(find(r, 'comp-macro').status).toBe('unmet')
  })
})
