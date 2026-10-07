import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'LING 50'],
  ['2270', 'LING 53'],
  ['2278', 'LING 100', 'LING 112'],
  ['2280', 'LING 113', 'LING 116'],
  ['2282', 'LING 171'],
)
const swap = (from: string, to: string | null) =>
  terms.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('linguistics-minor 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('lower division needs both LING 50 and LING 53', () => {
    expect(failing(run(harness, { terms: swap('LING 53', null) }))).toEqual(['lower/LING53:unmet'])
  })

  it('LING 111 and LING 112 cannot both count', () => {
    // 100 + 112 as the two; 111 would be the third elective
    const r = run(harness, { terms: swap('LING 171', 'LING 111') })
    expect(failing(r)).toEqual(['electives:unmet'])
  })

  it('an extra entry course may serve as an elective', () => {
    // LING 171 above already is an elective; replacing LING 113 with LING 101 still works
    expect(failing(run(harness, { terms: swap('LING 113', 'LING 101') }))).toEqual([])
  })

  it('only one entry course is not enough', () => {
    const t = swap('LING 100', 'LING 102').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LING 171' ? 'LING 117' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual(['entry-two:unmet'])
  })

  it('graduate LING courses count as electives', () => {
    expect(failing(run(harness, { terms: swap('LING 116', 'LING 211') }))).toEqual([])
  })

  it('LING 190 (2 credits) and LING 80-level courses do not count', () => {
    expect(find(run(harness, { terms: swap('LING 116', 'LING 190') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('LING 116', 'LING 80K') }), 'electives').status).toBe('unmet')
  })

  it('only one quarter of LING 199', () => {
    expect(failing(run(harness, { terms: swap('LING 116', 'LING 199') }))).toEqual([])
    const t = [...swap('LING 116', 'LING 199'), { term: '2288', courses: ['LING 199'] }]
    const r = run(harness, { terms: t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LING 113') })) })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('an outside upper-division course is cannot-check, not unmet', () => {
    const r = run(harness, { terms: swap('LING 116', 'PHIL 123') })
    expect(find(r, 'electives').status).toBe('cannot-check')
    // a lower-division outside course is not a candidate
    expect(find(run(harness, { terms: swap('LING 116', 'PHIL 9') }), 'electives').status).toBe('unmet')
  })

  it('at most two outside courses (LING 199 included)', () => {
    const t = swap('LING 116', 'LING 199').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LING 113' ? 'PHIL 123' : c === 'LING 171' ? 'PHIL 108' : c)) }))
    // LING 100 + 112 as the two; electives LING 199, PHIL 123, PHIL 108 = three outside
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms, grades: { 'LING 100': 'P', 'LING 113': 'P' } }))).toEqual([])
  })
})

describe('linguistics-minor 2026-27 review', () => {
  it('declared pre-approved outside courses count, at most two (with LING 199)', () => {
    const t = swap('LING 116', 'PHIL 123')
    expect(find(run(harness, { terms: t, choices: { outside_courses: 'PHIL 123' } }), 'electives').status).toBe('met')
    // "Students may substitute up to two outside courses for the Upper-Division Electives requirement."
    const three = swap('LING 116', 'LING 199').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LING 113' ? 'PHIL 123' : c === 'LING 171' ? 'PHIL 108' : c)) }))
    expect(find(run(harness, { terms: three, choices: { outside_courses: 'PHIL 123, PHIL 108' } }), 'electives').status).toBe('unmet')
  })

  it('kitchen sink and empty plan', () => {
    const sink = [...terms, { term: '2288', courses: ['LING 101', 'LING 111', 'LING 199', 'LING 199', 'LING 211', 'PHIL 123', 'LING 190', 'LING 80K'] }]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
    expect(failing(run(harness, { terms: [] }))).toEqual(['lower/LING50:unmet', 'lower/LING53:unmet', 'entry-two:unmet', 'electives:unmet'])
  })

  it('NP does not count; planned courses are in progress', () => {
    expect(failing(run(harness, { terms, grades: { 'LING 116': 'NP' } }))).toEqual(['electives:unmet'])
    expect(find(run(harness, { terms, currentTerm: '2282' }), 'electives').status).toBe('in-progress')
  })
})
