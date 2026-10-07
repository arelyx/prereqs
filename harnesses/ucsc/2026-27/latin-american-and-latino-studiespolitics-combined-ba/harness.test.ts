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

describe('latin-american-and-latino-studiespolitics-combined-ba 2026-27 review (wave 2)', () => {
  it('LGST cross-listings are the politics core courses', () => {
    expect(failing(run(harness, { terms: swap('POLI 105A', 'LGST 105A') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('POLI 110', 'LGST 160B') }))).toEqual([])
  })

  it('a POLI core course and its LGST cross-listing count once (not two core courses)', () => {
    expect(find(run(harness, { terms: swap('POLI 160A', 'LGST 105A') }), 'poli-core').status).toBe('unmet')
  })

  it('LGST 111B (filed under LGST, cross-listed POLI 111B) is a POLI 100-189 elective', () => {
    expect(failing(run(harness, { terms: swap('POLI 110', 'LGST 111B') }))).toEqual([])
  })

  it('POLI 190 seminar does not count as the POLI elective (100-189)', () => {
    expect(find(run(harness, { terms: swap('POLI 110', 'POLI 190A') }), 'poli-elective').status).toBe('unmet')
  })

  it('a 2-credit LALS course is not a LALS elective', () => {
    expect(find(run(harness, { terms: swap('LALS 158', 'LALS 190F') }), 'lals-electives').status).toBe('unmet')
  })

  it('LALS 100L without LALS 100A fails core and DC', () => {
    const r = run(harness, { terms: swap('LALS 100A') })
    expect(find(r, 'core').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('a D in the lower-division POLI course does not count', () => {
    expect(find(run(harness, { terms: base, grades: { 'POLI 1': 'D' } }), 'poli-ld').status).toBe('unmet')
  })

  it('no-term credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: swap('POLI 1'), completed: ['POLI 1'] }))).toEqual([])
    const e = run(harness, { terms: [] })
    expect(find(e, 'poli-core').status).toBe('unmet')
    expect(find(e, 'comprehensive').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'POLI 140A', 'POLI 140D', 'LALS 1', 'LALS 5', 'POLI 190A', 'LALS 170', 'POLI 17'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
  })
})
