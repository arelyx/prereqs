import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LGST 10'],
  ['2278', 'LGST 109', 'POLI 111A'],
  ['2280', 'ECON 169', 'SOCY 122'],
  ['2282', 'PSYC 147A'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)

describe('legal-studies-minor 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('LGST 10 is required', () => {
    expect(find(run(harness, { terms: swap('LGST 10', 'POLI 1') }), 'lgst10').status).toBe('unmet')
  })

  it('an unlisted upper-division course does not count', () => {
    expect(find(run(harness, { terms: swap('PSYC 147A', 'PSYC 100') }), 'upper').status).toBe('unmet')
  })

  it('cross-listed partner codes count (LGST 169 = ECON 169)', () => {
    expect(find(run(harness, { terms: swap('ECON 169', 'LGST 169') }), 'upper').status).toBe('met')
  })

  it('upper-division LGST courses not on the list count (LGST 113)', () => {
    expect(find(run(harness, { terms: swap('PSYC 147A', 'LGST 113') }), 'upper').status).toBe('met')
  })

  it('LGST 188A + OAKS 188B together are one course', () => {
    expect(find(run(harness, { terms: swap('PSYC 147A', 'LGST 188A') }), 'upper').status).toBe('unmet')
    const t = swap('PSYC 147A', 'LGST 188A')
    t.push({ term: '2284', courses: ['OAKS 188B'] })
    expect(find(run(harness, { terms: t }), 'upper').status).toBe('met')
  })

  it('independent study only with the department: cannot-check, not unmet', () => {
    expect(find(run(harness, { terms: swap('PSYC 147A', 'LGST 199') }), 'upper').status).toBe('cannot-check')
  })

  it('a major-list course missing from the minor list (ART 175) is not called unmet', () => {
    expect(find(run(harness, { terms: swap('PSYC 147A', 'ART 175') }), 'upper').status).toBe('cannot-check')
  })

  it('P/NP counts (no letter grade policy)', () => {
    expect(failing(run(harness, { terms: base, grades: { 'LGST 10': 'P', 'LGST 109': 'P' } }))).toEqual([])
  })

  it('a lower-division course does not count as upper-division', () => {
    expect(find(run(harness, { terms: swap('PSYC 147A', 'PHIL 22') }), 'upper').status).toBe('unmet')
  })
})
