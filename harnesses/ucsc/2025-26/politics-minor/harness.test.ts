import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'POLI 1'],
  ['2278', 'POLI 105A', 'POLI 105C'],
  ['2280', 'POLI 160A', 'POLI 160D'],
  ['2282', 'POLI 110'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)

describe('politics-minor 2025-26', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('lower-division course must be POLI 1-70', () => {
    expect(find(run(harness, { terms: swap('POLI 1', 'POLI 80') }), 'lower').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('POLI 1', 'POLI 70') }), 'lower').status).toBe('met')
  })

  it('two each from two subfields: 2+1+1 is not enough', () => {
    expect(find(run(harness, { terms: swap('POLI 160D', 'POLI 120A') }), 'core').status).toBe('unmet')
  })

  it('3+1 is not enough', () => {
    expect(find(run(harness, { terms: swap('POLI 160D', 'POLI 105B') }), 'core').status).toBe('unmet')
  })

  it('an extra core course can be the elective, but not double count', () => {
    expect(failing(run(harness, { terms: swap('POLI 110', 'POLI 105B') }))).toEqual([])
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'POLI 110') }))
    expect(find(run(harness, { terms: t }), 'elective').status).toBe('unmet')
  })

  it('elective must be POLI 100-189', () => {
    expect(find(run(harness, { terms: swap('POLI 110', 'POLI 190A') }), 'elective').status).toBe('unmet')
  })

  it('cross-listed LGST 160B counts as POLI 160B', () => {
    expect(find(run(harness, { terms: swap('POLI 160D', 'LGST 160B') }), 'core').status).toBe('met')
  })

  it('review: partner codes LGST 105A / LGST 120A fill the subfield pattern', () => {
    expect(find(run(harness, { terms: swap('POLI 105A', 'LGST 105A') }), 'core').status).toBe('met')
  })

  it('review: LGST 185 (cross-listed POLI 180) is a POLI 100-189 elective; POLI 199 is not', () => {
    expect(find(run(harness, { terms: swap('POLI 110', 'LGST 185') }), 'elective').status).toBe('met')
    expect(find(run(harness, { terms: swap('POLI 110', 'POLI 199') }), 'elective').status).toBe('unmet')
  })

  it('review: P counts; empty plan unmet', () => {
    expect(failing(run(harness, { terms: base, grades: { 'POLI 105A': 'P' } }))).toEqual([])
    expect(run(harness, { terms: [] }).status).toBe('unmet')
  })
})
