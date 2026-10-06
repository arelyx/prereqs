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
