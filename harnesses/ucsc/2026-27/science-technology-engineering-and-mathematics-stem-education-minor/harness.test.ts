import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'EDUC 50A', 'EDUC 60'],
  ['2278', 'EDUC 100A', 'EDUC 140'],
  ['2280', 'EDUC 185B', 'EDUC 185L'],
  ['2282', 'EDUC 166', 'EDUC 187'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('science-technology-engineering-and-mathematics-stem-education-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('any one of EDUC 50A/B/C and 100A/B/C', () => {
    expect(failing(run(harness, { terms: swap('EDUC 50A', 'EDUC 50C') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('EDUC 100A', 'EDUC 100B') }))).toEqual([])
    expect(find(run(harness, { terms: swap('EDUC 100A') }), 'educ100').status).toBe('unmet')
  })

  it('EDUC 185L is required', () => {
    expect(find(run(harness, { terms: swap('EDUC 185L') }), 'educ185l').status).toBe('unmet')
  })

  it('EDUC 185B/C cannot double as an elective', () => {
    const t = swap('EDUC 187', 'EDUC 185C')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    const r = run(harness, { terms: swap('EDUC 187') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('the diversity course must be on the list and is not also an elective', () => {
    expect(find(run(harness, { terms: swap('EDUC 140', 'EDUC 102') }), 'cld').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('EDUC 140', 'EDUC 110') }))).toEqual([])
    expect(find(run(harness, { terms: swap('EDUC 166') }), 'electives').status).toBe('unmet')
  })

  it('electives are 5-credit EDUC 102-187 (EDUC 190, 2-credit courses do not count)', () => {
    expect(find(run(harness, { terms: swap('EDUC 166', 'EDUC 190') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EDUC 166', 'EDUC 100B') }), 'electives').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'EDUC 50A': 'P', 'EDUC 185L': 'P' } }))).toEqual([])
  })
})
