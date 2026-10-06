import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LALS 1', 'SOCY 1', 'SOCY 15'],
  ['2278', 'LALS 100', 'LALS 100A', 'LALS 100L', 'SOCY 105A'],
  ['2280', 'SOCY 105B', 'LALS 143', 'SOCY 156'],
  ['2282', 'LALS 181', 'SOCY 170'],
  ['2288', 'LALS 194B', 'LALS 194L'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studiessociology-combined-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('SOCY 196S satisfies the comprehensive instead of the LALS seminar + lab', () => {
    const t = swap('LALS 194B', 'SOCY 196S').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LALS 194L') }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('LALS seminar without LALS 194L does not satisfy the comprehensive', () => {
    expect(find(run(harness, { terms: swap('LALS 194L') }), 'comprehensive').status).toBe('unmet')
  })

  it('needs two of SOCY 1/10/15', () => {
    expect(find(run(harness, { terms: swap('SOCY 15') }), 'socy-ld').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('SOCY 15', 'SOCY 10') }), 'socy-ld').status).toBe('met')
  })

  it('SOCY 105B is required', () => {
    expect(find(run(harness, { terms: swap('SOCY 105B') }), 'core').status).toBe('unmet')
  })

  it('sociology electives are 110-189: SOCY 105A/B, 196S and 199 do not count', () => {
    expect(find(run(harness, { terms: swap('SOCY 170', 'SOCY 199') }), 'socy-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('SOCY 170', 'SOCY 196S') }), 'socy-electives').status).toBe('unmet')
  })

  it('two LALS electives needed', () => {
    expect(find(run(harness, { terms: swap('LALS 181') }), 'lals-electives').status).toBe('unmet')
  })

  it('a grade below C does not count; P does', () => {
    expect(find(run(harness, { terms: base, grades: { 'SOCY 170': 'D+' } }), 'socy-electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'SOCY 170': 'P' } }))).toEqual([])
  })

  it('DC needs LALS 100L', () => {
    expect(find(run(harness, { terms: swap('LALS 100L') }), 'dc').status).toBe('unmet')
  })
})
