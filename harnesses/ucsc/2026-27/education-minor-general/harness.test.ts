import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'EDUC 60'],
  ['2278', 'EDUC 128', 'EDUC 141'],
  ['2280', 'EDUC 180', 'EDUC 164'],
  ['2282', 'EDUC 181'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('education-minor-general 2026-27', () => {
  it('complete record (electives before EDUC 180 are fine)', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('EDUC 60 is required', () => {
    expect(find(run(harness, { terms: swap('EDUC 60') }), 'educ60').status).toBe('unmet')
  })

  it('EDUC 110 or 180 is required', () => {
    expect(find(run(harness, { terms: swap('EDUC 180') }), 'foundation').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('EDUC 180', 'EDUC 110') }))).toEqual([])
  })

  it('the other of EDUC 110/180 can be an elective', () => {
    expect(failing(run(harness, { terms: swap('EDUC 181', 'EDUC 110') }))).toEqual([])
  })

  it('EDUC 180 cannot be both the required course and an elective', () => {
    expect(find(run(harness, { terms: swap('EDUC 181') }), 'electives').status).toBe('unmet')
  })

  it('electives must be 5-credit EDUC 102-187', () => {
    expect(find(run(harness, { terms: swap('EDUC 181', 'EDUC 190') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EDUC 181', 'EDUC 185L') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EDUC 181', 'EDUC 10') }), 'electives').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'EDUC 60': 'P', 'EDUC 164': 'P' } }))).toEqual([])
  })
})

describe('education-minor-general 2026-27 review (wave 2)', () => {
  it('CRES 121 [/EDUC 121] and KRSG 178 [/EDUC 178] are EDUC electives (cross-listed)', () => {
    expect(failing(run(harness, { terms: swap('EDUC 181', 'CRES 121') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('EDUC 181', 'KRSG 178') }))).toEqual([])
  })

  // "Students take four 5-credit electives chosen EDUC 102-187."
  it('2-/3-credit OAKS 151A/B [/EDUC 151A/B] are not 5-credit electives', () => {
    expect(find(run(harness, { terms: swap('EDUC 181', 'OAKS 151A') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EDUC 181', 'EDUC 151B') }), 'electives').status).toBe('unmet')
  })

  it('a repeatable topics course (EDUC 178) may count twice; a non-repeatable one once', () => {
    expect(failing(run(harness, { terms: [...swap('EDUC 181', 'EDUC 178'), ...plan(['2290', 'EDUC 178'])].map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'EDUC 164') })) }))).toEqual([])
    expect(find(run(harness, { terms: [...swap('EDUC 181'), ...plan(['2290', 'EDUC 164'])] }), 'electives').status).toBe('unmet')
  })

  it('outside courses do not count (no substitution path on this page)', () => {
    expect(find(run(harness, { terms: swap('EDUC 181', 'SOCY 148') }), 'electives').status).toBe('unmet')
  })

  it('a failing grade does not count', () => {
    expect(find(run(harness, { terms: base, grades: { 'EDUC 60': 'F' } }), 'educ60').status).toBe('unmet')
  })

  it('no-term credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: swap('EDUC 60'), completed: ['EDUC 60'] }))).toEqual([])
    const e = run(harness, { terms: [] })
    expect(find(e, 'electives').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'EDUC 110', 'EDUC 10', 'EDUC 190', 'EDUC 102', 'EDUC 185L'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
  })
})
