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

describe('science-technology-engineering-and-mathematics-stem-education-minor 2025-26', () => {
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

describe('science-technology-engineering-and-mathematics-stem-education-minor 2025-26 review (wave 2)', () => {
  // "Students take two additional 5-credit courses numbered EDUC 102-EDUC 187."
  it('2-/3-credit OAKS 151A/B [/EDUC 151A/B] are not 5-credit electives', () => {
    expect(find(run(harness, { terms: swap('EDUC 166', 'OAKS 151B') }), 'electives').status).toBe('unmet')
  })

  it('CRES 121 [/EDUC 121] is an EDUC elective', () => {
    expect(failing(run(harness, { terms: swap('EDUC 166', 'CRES 121') }))).toEqual([])
  })

  it('EDUC 185L (3 credits) without EDUC 185B/C: 185B/C unmet', () => {
    expect(find(run(harness, { terms: swap('EDUC 185B') }), 'educ185').status).toBe('unmet')
  })

  it('EDUC 185B and 185C both taken: one counts as the required course, the other as an elective', () => {
    expect(failing(run(harness, { terms: swap('EDUC 166', 'EDUC 185C') }))).toEqual([])
  })

  it('EDUC 110 is a diversity course; a second diversity course can be an elective', () => {
    expect(failing(run(harness, { terms: swap('EDUC 166', 'EDUC 110') }))).toEqual([])
  })

  it('two CalTeach 1 courses do not stand in for CalTeach 2', () => {
    expect(find(run(harness, { terms: swap('EDUC 100A', 'EDUC 50B') }), 'educ100').status).toBe('unmet')
  })

  it('no-term credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: swap('EDUC 60'), completed: ['EDUC 60'] }))).toEqual([])
    const e = run(harness, { terms: [] })
    expect(find(e, 'educ185l').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'EDUC 50B', 'EDUC 50C', 'EDUC 100B', 'EDUC 100C', 'EDUC 185C', 'EDUC 125', 'EDUC 128', 'EDUC 190'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
  })
})
