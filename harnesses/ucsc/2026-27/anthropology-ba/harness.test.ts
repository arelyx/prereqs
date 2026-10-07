import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// ANTH 1/2/3; five core + four electives + one senior seminar = ten upper-division courses.
const terms = plan(
  ['2268', 'ANTH 1', 'ANTH 2'],
  ['2270', 'ANTH 3'],
  ['2278', 'ANTH 150', 'ANTH 110A', 'ANTH 130A'],
  ['2280', 'ANTH 184', 'ANTH 101', 'ANTH 130I'],
  ['2282', 'ANTH 110T', 'ANTH 131'],
  ['2288', 'ANTH 159'],
  ['2290', 'ANTH 194M'],
)
const choices = { theory: 'ANTH 150', sociocultural: 'ANTH 110A', regional: 'ANTH 130A', archaeology: 'ANTH 184', biological: 'ANTH 101' }
const swap = (from: string, to: string, t = terms) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('anthropology-ba 2026-27', () => {
  it('complete record with core assignments', () => {
    expect(failing(run(harness, { terms, choices }))).toEqual([])
  })

  it('without core assignments the core requirements are cannot-check, not met', () => {
    const r = run(harness, { terms })
    expect(find(r, 'core-theory').status).toBe('cannot-check')
    expect(find(r, 'upper-ten').status).toBe('met')
  })

  it('ten upper-division courses are required (the seminar is one of them)', () => {
    const r = run(harness, { terms: drop('ANTH 159'), choices })
    expect(find(r, 'upper-ten').status).toBe('unmet')
    expect(failing(r)).toEqual(['upper-ten:unmet'])
  })

  it('a senior seminar or thesis is required for DC and the comprehensive', () => {
    const r = run(harness, { terms: swap('ANTH 194M', 'ANTH 134'), choices })
    expect(find(r, 'upper-ten').status).toBe('met')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('ANTH 196 series and ANTH 195S also satisfy the comprehensive', () => {
    expect(failing(run(harness, { terms: swap('ANTH 194M', 'ANTH 196J'), choices }))).toEqual([])
    expect(failing(run(harness, { terms: swap('ANTH 194M', 'ANTH 195S'), choices }))).toEqual([])
  })

  it('the biological thesis series needs all of ANTH 195A, 195B and 195C', () => {
    const t = swap('ANTH 194M', 'ANTH 195A')
    t[5].courses.push('ANTH 195C')
    // ANTH 195A and 195C (5 credits) are among the ten; 195B (2 credits) is not.
    let r = run(harness, { terms: t, choices })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    t[5].courses.push('ANTH 195B')
    r = run(harness, { terms: t, choices })
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('only one 5-credit individual study counts toward the ten', () => {
    let t = swap('ANTH 159', 'ANTH 199')
    expect(find(run(harness, { terms: t, choices }), 'upper-ten').status).toBe('met')
    t = swap('ANTH 131', 'ANTH 198', t)
    expect(find(run(harness, { terms: t, choices }), 'upper-ten').status).toBe('unmet')
  })

  it('two-credit courses do not count', () => {
    expect(find(run(harness, { terms: swap('ANTH 159', 'ANTH 199F'), choices }), 'upper-ten').status).toBe('unmet')
  })

  it('a graduate anthropology seminar may count as an elective', () => {
    expect(failing(run(harness, { terms: swap('ANTH 159', 'ANTH 259'), choices }))).toEqual([])
  })

  it('one course cannot cover two core requirements', () => {
    const r = run(harness, { terms, choices: { ...choices, regional: 'ANTH 110A' } })
    expect(find(r, 'core-regional').status).toBe('unmet')
  })

  it('an individual study cannot be a core course; an assigned course must be in the plan', () => {
    const t = swap('ANTH 159', 'ANTH 199')
    expect(find(run(harness, { terms: t, choices: { ...choices, archaeology: 'ANTH 199' } }), 'core-archaeology').status).toBe('unmet')
    expect(find(run(harness, { terms, choices: { ...choices, archaeology: 'ANTH 176' } }), 'core-archaeology').status).toBe('unmet')
  })

  it('lower division needs ANTH 1, 2 and 3', () => {
    expect(find(run(harness, { terms: drop('ANTH 2'), choices }), 'lower').status).toBe('unmet')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms, choices, grades: { 'ANTH 194M': 'P', 'ANTH 1': 'P' } }))).toEqual([])
  })

  it('a senior seminar may be assigned to a core requirement, but ten courses are still needed', () => {
    const c = { ...choices, biological: 'ANTH 194M' }
    expect(failing(run(harness, { terms, choices: c }))).toEqual([])
    expect(find(run(harness, { terms: drop('ANTH 101'), choices: c }), 'upper-ten').status).toBe('unmet')
  })
})

// Adversarial review (2026-10-06).
describe('anthropology-ba 2026-27 — review', () => {
  it('a core course entered under its cross-listed code matches the assignment', () => {
    // Cross-listed codes are one course: CRES 110Q is ANTH 110Q.
    const t = swap('ANTH 110A', 'CRES 110Q')
    expect(failing(run(harness, { terms: t, choices: { ...choices, sociocultural: 'ANTH 110Q' } }))).toEqual([])
    expect(failing(run(harness, { terms: t, choices: { ...choices, sociocultural: 'FMST 110Q' } }))).toEqual([])
  })

  it('one cross-listed course cannot cover two core requirements under its two codes', () => {
    const t = swap('ANTH 110A', 'ANTH 110Q')
    const r = run(harness, { terms: t, choices: { ...choices, sociocultural: 'ANTH 110Q', regional: 'CRES 110Q' } })
    expect(find(r, 'core-regional').status).toBe('unmet')
    expect(find(r, 'core-regional').detail).toMatch(/already assigned/)
  })

  it('a senior seminar entered under its CRES code (CRES 190G = ANTH 196G) satisfies DC and the comprehensive', () => {
    expect(failing(run(harness, { terms: swap('ANTH 194M', 'CRES 190G'), choices }))).toEqual([])
  })

  it('empty plan is incomplete', () => {
    const r = run(harness, { terms: [] })
    expect(verdict(r).complete).toBe(false)
    expect(find(r, 'core-theory').status).toBe('unmet')
  })

  it('a 6-credit abroad workshop (ANTH 151S) counts toward the ten', () => {
    expect(failing(run(harness, { terms: swap('ANTH 159', 'ANTH 151S'), choices }))).toEqual([])
  })

  it('a non-anthropology upper-division course is not an elective', () => {
    expect(find(run(harness, { terms: swap('ANTH 159', 'SOCY 120'), choices }), 'upper-ten').status).toBe('unmet')
  })

  it('a 3-credit independent field study (ANTH 198G) does not count', () => {
    expect(find(run(harness, { terms: swap('ANTH 159', 'ANTH 198G'), choices }), 'upper-ten').status).toBe('unmet')
  })

  it('transfer (no-term) ANTH 1 counts', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'ANTH 1') }))
    expect(failing(run(harness, { terms: t, completed: ['ANTH 1'], choices }))).toEqual([])
  })

  it('planned courses are in progress', () => {
    const r = run(harness, { terms, choices, currentTerm: '2290' })
    expect(find(r, 'comprehensive').status).toBe('in-progress')
    expect(verdict(r).complete).toBe(false)
  })
})
