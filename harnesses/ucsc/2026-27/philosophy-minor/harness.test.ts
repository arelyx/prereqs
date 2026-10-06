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

describe('philosophy-minor 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('PHIL 9 is required; PHIL 7 is not a lower-division elective', () => {
    expect(find(run(harness, { terms: drop(base, 'PHIL 9') }), 'phil9').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('PHIL 22', 'PHIL 7') }), 'lower-elective').status).toBe('unmet')
  })

  it('value theory needed (one of four), unless PHIL 100D is the history course', () => {
    const t = swap('PHIL 142', 'PHIL 106')
    expect(find(run(harness, { terms: t }), 'value-theory').status).toBe('unmet')
    const r = run(harness, { terms: swapIn(t, 'PHIL 100C', 'PHIL 100D') })
    expect(failing(r)).toEqual([])
  })

  it('PHIL 100D as history still needs four more electives', () => {
    const t = swapIn(drop(base, 'PHIL 142'), 'PHIL 100C', 'PHIL 100D')
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('two metaphysics/epistemology courses', () => {
    const t = swapIn(swap('PHIL 133', 'PHIL 143'), 'PHIL 125', 'PHIL 148')
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('history course is not also an elective', () => {
    expect(find(run(harness, { terms: drop(base, 'PHIL 125') }), 'ud-electives').status).toBe('unmet')
  })

  it('C- does not count; P does', () => {
    expect(find(run(harness, { terms: base, grades: { 'PHIL 121': 'C-' } }), 'ud-electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'PHIL 121': 'P' } }))).toEqual([])
  })

  it('PHIL 199 does not count as an elective', () => {
    expect(find(run(harness, { terms: swap('PHIL 125', 'PHIL 199') }), 'ud-electives').status).toBe('unmet')
  })

  it('review: LGST 140P (PHIL 100D) as history covers value theory; four electives still needed', () => {
    const t = swapIn(swap('PHIL 100C', 'LGST 140P'), 'PHIL 142', 'PHIL 122')
    const r = run(harness, { terms: t })
    expect(find(r, 'value-theory').status).toBe('met')
    expect(failing(r)).toEqual([])
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
