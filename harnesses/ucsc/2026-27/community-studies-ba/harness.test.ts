import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// CMMU 10, core, three topical courses before field study (CMMU 105A-C), then CMMU 107.
const terms = plan(
  ['2268', 'CMMU 10'],
  ['2278', 'CMMU 101', 'CMMU 130', 'PSYC 149'],
  ['2280', 'CMMU 100', 'SOCY 177'],
  ['2282', 'CMMU 105A'],
  ['2288', 'CMMU 105B'],
  ['2290', 'CMMU 105C'],
  ['2292', 'CMMU 107'],
)
const swap = (from: string, to: string) => terms.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('community-studies-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('CMMU 20 also satisfies the lower-division course', () => {
    expect(find(run(harness, { terms: swap('CMMU 10', 'CMMU 20') }), 'lower').status).toBe('met')
  })

  it('every core course is required, including each field study quarter', () => {
    const r = run(harness, { terms: drop('CMMU 105C') })
    expect(find(r, 'core').status).toBe('unmet')
    expect(failing(r)).toEqual(['core/CMMU105C:unmet'])
  })

  it('three topical courses are required', () => {
    expect(find(run(harness, { terms: drop('SOCY 177') }), 'topical').status).toBe('unmet')
  })

  it('a topical course taken during or after field study does not count', () => {
    const t = drop('SOCY 177')
    t[5].courses.push('SOCY 177') // with CMMU 105C
    const n = find(run(harness, { terms: t }), 'topical')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/before field study/)
  })

  it('an extra early topical course lets a late one be ignored', () => {
    const t = [...terms.map((q) => ({ ...q, courses: [...q.courses] }))]
    t[0].courses.push('ANTH 134')
    t[6].courses.push('EDUC 181')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('letter grade C or better is required for every course', () => {
    expect(find(run(harness, { terms, grades: { 'CMMU 130': 'P' } }), 'topical').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'CMMU 101': 'C-' } }), 'core').status).toBe('unmet')
    expect(failing(run(harness, { terms, grades: { 'CMMU 101': 'C' } }))).toEqual([])
  })

  it('a topical course recorded under its cross-listed code counts', () => {
    expect(find(run(harness, { terms: swap('SOCY 177', 'LGST 130B') }), 'topical').status).toBe('met')
  })

  it('an unlisted upper-division course is not a topical course', () => {
    expect(find(run(harness, { terms: swap('SOCY 177', 'SOCY 105A') }), 'topical').status).toBe('unmet')
  })

  it('DC and the capstone essay need CMMU 107', () => {
    const r = run(harness, { terms: drop('CMMU 107') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'capstone-essay').status).toBe('unmet')
  })
})
