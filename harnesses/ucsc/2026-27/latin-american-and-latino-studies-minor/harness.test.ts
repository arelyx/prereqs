import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LALS 10', 'LALS 80F'],
  ['2278', 'LALS 100'],
  ['2280', 'LALS 113', 'LALS 143'],
  ['2282', 'LALS 170', 'LALS 181'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studies-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('core may be LALS 100A with its lab instead of LALS 100', () => {
    expect(find(run(harness, { terms: swap('LALS 100', 'LALS 100A', 'LALS 100L') }), 'core').status).toBe('met')
    expect(find(run(harness, { terms: swap('LALS 100', 'LALS 100A') }), 'core').status).toBe('unmet')
  })

  it('the other core course can be one of the four electives', () => {
    const r = run(harness, { terms: swap('LALS 181', 'LALS 100A', 'LALS 100L') })
    expect(failing(r)).toEqual([])
  })

  it('a senior seminar can be an elective', () => {
    expect(failing(run(harness, { terms: swap('LALS 181', 'LALS 194A') }))).toEqual([])
  })

  it('four electives are needed', () => {
    expect(find(run(harness, { terms: swap('LALS 181') }), 'ud-electives').status).toBe('unmet')
  })

  it('LALS 194L (2 credits) is not an elective', () => {
    expect(find(run(harness, { terms: swap('LALS 181', 'LALS 194L') }), 'ud-electives').status).toBe('unmet')
  })

  it('the lower-division elective must be LALS 1-99, 5 credits; another intro course counts', () => {
    expect(find(run(harness, { terms: swap('LALS 80F', 'LALS 1') }), 'ld-elective').status).toBe('met')
    expect(find(run(harness, { terms: swap('LALS 80F', 'LALS 56L') }), 'ld-elective').status).toBe('unmet')
  })

  it('P grades are allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'LALS 113': 'P', 'LALS 10': 'P' } }))).toEqual([])
  })

  it('an outside upper-division course may be pre-approved: cannot-check', () => {
    expect(find(run(harness, { terms: swap('LALS 181', 'HIS 140B') }), 'ud-electives').status).toBe('cannot-check')
  })

  it('outside courses are limited to two across the minor', () => {
    let t = swap('LALS 80F', 'HIS 10A')
    t = t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'LALS 181' ? ['HIS 140B'] : c === 'LALS 170' ? ['POLI 140C'] : [c])) }))
    const r = run(harness, { terms: t })
    expect(find(r, 'ud-electives').status).toBe('unmet')
  })
})
