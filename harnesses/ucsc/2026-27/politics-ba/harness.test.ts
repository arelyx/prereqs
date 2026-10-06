import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// core: Theory 105A + 105B, U.S. 120A, Comparative 140A; electives 110, 130, 151, 175; seminar POLI 190A
const base = plan(
  ['2268', 'POLI 1', 'POLI 20'],
  ['2278', 'POLI 105A', 'POLI 105B'],
  ['2280', 'POLI 120A', 'POLI 140A'],
  ['2282', 'POLI 110', 'POLI 130', 'POLI 151'],
  ['2288', 'POLI 175', 'POLI 190A'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)
const drop = (t: Terms, code: string) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('politics-ba 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('two lower-division courses POLI 1-70', () => {
    expect(find(run(harness, { terms: drop(base, 'POLI 20') }), 'lower').status).toBe('unmet')
  })

  it('core pattern: two groups only (2+2) is not enough', () => {
    // 105A, 105B, 120A, 120B: two groups
    const r = run(harness, { terms: swap('POLI 140A', 'POLI 120B') })
    expect(find(r, 'core').status).toBe('unmet')
  })

  it('core pattern: one in each of four groups is left to the advisor', () => {
    const r = run(harness, { terms: swap('POLI 105B', 'POLI 160A') })
    expect(find(r, 'core').status).toBe('cannot-check')
  })

  it('core courses beyond four count as electives; core and electives never share a course', () => {
    // drop an elective: the core cannot lend a course
    expect(find(run(harness, { terms: drop(base, 'POLI 175') }), 'electives').status).toBe('unmet')
    // a fifth core course can be an elective
    const t = swap('POLI 175', 'POLI 160C')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('electives must be POLI 100-189 (POLI 199 only by petition, POLI 190A seminar not an elective)', () => {
    expect(find(run(harness, { terms: swap('POLI 175', 'POLI 199'), attested: [] }), 'electives-petition').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap('POLI 175', 'POLI 195A') }), 'electives').status).toBe('unmet')
  })

  it('cross-listed LGST 105A counts as POLI 105A', () => {
    expect(find(run(harness, { terms: swap('POLI 105A', 'LGST 105A') }), 'core').status).toBe('met')
  })

  it('DC: three core courses (overlay)', () => {
    expect(find(run(harness, { terms: base }), 'dc').status).toBe('met')
  })

  it('comprehensive: a seminar is needed (or another method)', () => {
    expect(find(run(harness, { terms: drop(base, 'POLI 190A') }), 'comprehensive').status).toBe('unmet')
  })

  it('comprehensive: fifth and sixth electives + POLI 199F + instructor approval', () => {
    const t = [...drop(base, 'POLI 190A'), { term: '2290', courses: ['POLI 182', 'POLI 185', 'POLI 199F'] }]
    expect(find(run(harness, { terms: t }), 'comprehensive').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
    // only one extra elective
    const one = [...drop(base, 'POLI 190A'), { term: '2290', courses: ['POLI 182', 'POLI 199F'] }]
    expect(find(run(harness, { terms: one }), 'comprehensive').status).toBe('unmet')
  })

  it('comprehensive: thesis needs two quarters', () => {
    const t = swap('POLI 190A', 'POLI 195A')
    expect(find(run(harness, { terms: t }), 'comprehensive').status).toBe('unmet')
    t.push({ term: '2290', courses: ['POLI 195B'] })
    expect(find(run(harness, { terms: t }), 'comprehensive').status).toBe('met')
  })

  it('comprehensive: graduate seminar is left to the student to confirm', () => {
    expect(find(run(harness, { terms: swap('POLI 190A', 'POLI 201') }), 'comprehensive').status).toBe('cannot-check')
  })

  it('review: one independent study may be an elective by petition (asked only when needed)', () => {
    // "Students may petition the department to substitute only one upper-division independent study or field study toward the elective requirement"
    const t = swap('POLI 175', 'POLI 199')
    expect(find(run(harness, { terms: t, attested: [] }), 'electives-petition').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['independent-petition'] }), 'electives-petition').status).toBe('met')
    expect(failing(run(harness, { terms: [...base, { term: '2290', courses: ['POLI 199'] }], attested: [] }))).toEqual([])
  })

  it('review: only one independent / field study may substitute', () => {
    const t = swapIn(swap('POLI 175', 'POLI 199'), 'POLI 151', 'POLI 198')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('review: cross-listed partner codes in the core pattern (LGST 105B, LGST 160B)', () => {
    expect(find(run(harness, { terms: swap('POLI 105B', 'LGST 105B') }), 'core').status).toBe('met')
  })

  it('review: four groups once each via a partner code is still the advisor case', () => {
    const t = swap('POLI 105B', 'LGST 160B')
    expect(find(run(harness, { terms: t }), 'core').status).toBe('cannot-check')
  })

  it('review: LGST 185 (cross-listed POLI 180) is a POLI 100-189 elective', () => {
    expect(find(run(harness, { terms: swap('POLI 175', 'LGST 185') }), 'electives').status).toBe('met')
  })

  it('review: P/NP counts; empty plan is unmet', () => {
    expect(failing(run(harness, { terms: base, grades: { 'POLI 105A': 'P', 'POLI 110': 'P' } }))).toEqual([])
    expect(run(harness, { terms: [], attested: [] }).status).toBe('unmet')
  })
})
