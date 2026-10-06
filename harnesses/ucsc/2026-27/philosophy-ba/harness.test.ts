import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// 2 lower + 2 history + 6 UD (incl. PHIL 190; value 142; M&E 121, 122) + 11th (PHIL 11)
const base = plan(
  ['2268', 'PHIL 9', 'PHIL 22'],
  ['2270', 'PHIL 11'],
  ['2278', 'PHIL 100A', 'PHIL 100B'],
  ['2280', 'PHIL 121', 'PHIL 122', 'PHIL 142'],
  ['2282', 'PHIL 125', 'PHIL 133'],
  ['2288', 'PHIL 190'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)
const drop = (t: Terms, code: string) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('philosophy-ba 2026-27', () => {
  it('complete record (11 courses)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('PHIL 7 and PHIL 8 are not the lower-division elective', () => {
    const r = run(harness, { terms: drop(swap('PHIL 22', 'PHIL 7'), 'PHIL 11') })
    expect(find(r, 'lower-elective').status).toBe('unmet')
  })

  it('a value theory course is required', () => {
    const r = run(harness, { terms: swap('PHIL 142', 'PHIL 127') })
    expect(find(r, 'ud-electives').status).toBe('unmet')
    expect(find(r, 'value-theory').status).toBe('unmet')
  })

  it('PHIL 100D as a history course also covers value theory, but six electives are still needed', () => {
    const t = swap('PHIL 142', 'PHIL 127')
    const withD = swapIn(t, 'PHIL 100B', 'PHIL 100D')
    const r = run(harness, { terms: withD })
    expect(find(r, 'value-theory').status).toBe('met')
    expect(failing(r)).toEqual([])
    // six still needed: drop one UD elective
    expect(find(run(harness, { terms: drop(withD, 'PHIL 127') }), 'ud-electives').status).toBe('unmet')
  })

  it('two metaphysics/epistemology courses', () => {
    // keep only PHIL 121 from M&E: 122,125,133 -> 142-ish value/other courses
    let t = swap('PHIL 122', 'PHIL 143')
    t = swapIn(t, 'PHIL 125', 'PHIL 148')
    t = swapIn(t, 'PHIL 133', 'PHIL 152')
    const n = find(run(harness, { terms: t }), 'ud-electives')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/Metaphysics and Epistemology: 1 of 2/)
  })

  it('history courses cannot double as UD electives', () => {
    expect(find(run(harness, { terms: drop(base, 'PHIL 133') }), 'ud-electives').status).toBe('unmet')
    // a third history course can be an elective
    expect(failing(run(harness, { terms: swap('PHIL 133', 'PHIL 100C') }))).toEqual([])
  })

  it('PHIL 195A and PHIL 199 do not count', () => {
    expect(find(run(harness, { terms: swap('PHIL 133', 'PHIL 199') }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('PHIL 11', 'PHIL 195A') }), 'eleventh').status).toBe('unmet')
  })

  it('grades below C do not count; P does', () => {
    expect(find(run(harness, { terms: base, grades: { 'PHIL 9': 'C-' } }), 'phil9').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'PHIL 9': 'P', 'PHIL 121': 'C' } }))).toEqual([])
  })

  it('senior seminar PHIL 190 is the comprehensive', () => {
    const r = run(harness, { terms: swap('PHIL 190', 'PHIL 135') })
    expect(find(r, 'seminar').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('the 11th course may be graduate-level', () => {
    expect(find(run(harness, { terms: swap('PHIL 11', 'PHIL 222') }), 'eleventh').status).toBe('met')
  })

  it('cross-listed LGST 144 counts as PHIL 144 (value theory)', () => {
    expect(find(run(harness, { terms: swap('PHIL 142', 'LGST 144') }), 'value-theory').status).toBe('met')
  })

  it('DC: two history courses', () => {
    expect(find(run(harness, { terms: drop(base, 'PHIL 100B') }), 'dc').status).toBe('unmet')
  })

  it('with three history courses including PHIL 100D, 100D goes to history and covers value theory', () => {
    // no value-theory elective; history 100A, 100B, 100D: one of 100A/100B becomes an elective
    const t = [...drop(swap('PHIL 142', 'PHIL 127'), 'PHIL 133'), { term: '2290', courses: ['PHIL 100D'] }]
    const r = run(harness, { terms: t })
    expect(find(r, 'value-theory').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('review: PHIL 7 is not the 11th course next to PHIL 9 (catalog: no credit for both)', () => {
    // catalog PHIL 7: "Students may not receive credit for this course and PHIL 9."
    expect(find(run(harness, { terms: swap('PHIL 11', 'PHIL 7') }), 'eleventh').status).toBe('unmet')
    // PHIL 8 is not excluded for the 11th course
    expect(find(run(harness, { terms: swap('PHIL 11', 'PHIL 8') }), 'eleventh').status).toBe('met')
  })

  it('review: PHIL 114 and PHIL 214 count once (catalog: no credit for both)', () => {
    const t = swapIn(swap('PHIL 11', 'PHIL 214'), 'PHIL 125', 'PHIL 114')
    expect(find(run(harness, { terms: t }), 'eleventh').status).toBe('unmet')
  })

  it('review: LGST 140P (PHIL 100D) is a history course and covers value theory', () => {
    const t = swapIn(swap('PHIL 100B', 'LGST 140P'), 'PHIL 142', 'PHIL 135')
    const r = run(harness, { terms: t })
    expect(find(r, 'history').status).toBe('met')
    expect(find(r, 'value-theory').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('review: a C- history course does not count; empty plan unmet', () => {
    expect(find(run(harness, { terms: base, grades: { 'PHIL 100A': 'C-' } }), 'history').status).toBe('unmet')
    expect(run(harness, { terms: [] }).status).toBe('unmet')
  })
})
