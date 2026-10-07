import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'PHIL 9', 'PHIL 22'],
  ['2278', 'PHIL 100C'],
  ['2280', 'PHIL 121', 'PHIL 133'],
  ['2282', 'PHIL 142', 'PHIL 125'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)
const drop = (t: Terms, code: string) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('philosophy-minor 2025-26', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('PHIL 9 is required; PHIL 8 is not a lower-division elective', () => {
    expect(find(run(harness, { terms: drop(base, 'PHIL 9') }), 'phil9').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('PHIL 22', 'PHIL 8') }), 'lower-elective').status).toBe('unmet')
  })

  it('2025-26: PHIL 7 is not excluded by the page, but cannot be credited next to PHIL 9 (catalog)', () => {
    expect(find(run(harness, { terms: swap('PHIL 22', 'PHIL 7') }), 'lower-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: drop(swap('PHIL 22', 'PHIL 7'), 'PHIL 9') }), 'lower-elective').status).toBe('met')
  })

  it('value theory needed (one of four)', () => {
    expect(find(run(harness, { terms: swap('PHIL 142', 'PHIL 106') }), 'value-theory').status).toBe('unmet')
  })

  it('2025-26: PHIL 100D / PHIL 140 / LGST 140P is not a history course; it is value theory', () => {
    for (const c of ['PHIL 100D', 'PHIL 140', 'LGST 140P']) {
      expect(find(run(harness, { terms: swap('PHIL 100C', c) }), 'history').status).toBe('unmet')
      expect(failing(run(harness, { terms: swap('PHIL 142', c) }))).toEqual([])
    }
  })


  it('two metaphysics/epistemology courses', () => {
    const t = swapIn(swap('PHIL 133', 'PHIL 143'), 'PHIL 125', 'PHIL 148')
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('history course is not also an elective', () => {
    expect(find(run(harness, { terms: drop(base, 'PHIL 125') }), 'ud-electives').status).toBe('unmet')
  })

  it('2025-26: no letter-grade policy — C- and P both count', () => {
    expect(failing(run(harness, { terms: base, grades: { 'PHIL 121': 'C-' } }))).toEqual([])
    expect(failing(run(harness, { terms: base, grades: { 'PHIL 121': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'PHIL 121': 'F' } }), 'ud-electives').status).toBe('unmet')
  })

  it('PHIL 199 does not count as an elective', () => {
    expect(find(run(harness, { terms: swap('PHIL 125', 'PHIL 199') }), 'ud-electives').status).toBe('unmet')
  })


  it('review: LGST 144 (PHIL 144) is a value theory elective', () => {
    expect(failing(run(harness, { terms: swap('PHIL 142', 'LGST 144') }))).toEqual([])
  })

  it('review: PHIL 114 and PHIL 214 count once (catalog: no credit for both)', () => {
    const t = swapIn(swap('PHIL 125', 'PHIL 114'), 'PHIL 133', 'PHIL 214')
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('review: empty plan unmet', () => {
    expect(run(harness, { terms: [] }).status).toBe('unmet')
  })
})
