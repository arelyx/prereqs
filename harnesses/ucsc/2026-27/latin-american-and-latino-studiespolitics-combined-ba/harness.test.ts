import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LALS 10', 'POLI 1'],
  ['2278', 'LALS 100', 'LALS 100A', 'LALS 100L', 'POLI 140C'],
  ['2280', 'POLI 105A', 'POLI 120A', 'POLI 160A'],
  ['2282', 'LALS 143', 'LALS 158', 'POLI 110'],
  ['2288', 'LALS 194X', 'LALS 194L'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studiespolitics-combined-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('POLI senior seminar instead of the LALS seminar + lab', () => {
    const t = swap('LALS 194X', 'POLI 190A').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LALS 194L') }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('LALS seminar without its lab does not satisfy the comprehensive', () => {
    expect(find(run(harness, { terms: swap('LALS 194L') }), 'comprehensive').status).toBe('unmet')
  })

  it('POLI 140C is required', () => {
    expect(find(run(harness, { terms: swap('POLI 140C') }), 'core').status).toBe('unmet')
  })

  it('POLI 140C cannot also be a politics core course', () => {
    expect(find(run(harness, { terms: swap('POLI 160A') }), 'poli-core').status).toBe('unmet')
  })

  it('a fourth politics core course can be the POLI elective', () => {
    expect(failing(run(harness, { terms: swap('POLI 110', 'POLI 140A') }))).toEqual([])
  })

  it('a politics core course cannot be both core and elective', () => {
    const r = run(harness, { terms: swap('POLI 110') })
    expect([find(r, 'poli-core').status, find(r, 'poli-elective').status]).toContain('unmet')
  })

  it('lower-division POLI must be numbered 1-70', () => {
    expect(find(run(harness, { terms: swap('POLI 1', 'POLI 111A') }), 'poli-ld').status).toBe('unmet')
  })

  it('LALS electives are 101-190, so a senior seminar is not an elective', () => {
    expect(find(run(harness, { terms: swap('LALS 158', 'LALS 194A') }), 'lals-electives').status).toBe('unmet')
  })

  it('C or better or P', () => {
    expect(find(run(harness, { terms: base, grades: { 'POLI 105A': 'C-' } }), 'poli-core').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'POLI 105A': 'P' } }))).toEqual([])
  })

  it('DC needs LALS 100A and 100L', () => {
    expect(find(run(harness, { terms: swap('LALS 100A') }), 'dc').status).toBe('unmet')
  })
})
