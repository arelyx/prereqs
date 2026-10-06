import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// 11 courses: FMST 1, FMST 20, FMST 100, seven electives (three FMST + four
// affiliated), FMST 194A senior seminar → FMST courses: 1, 20, 100, 102, 105, 120, 194A = 7.
const terms = plan(
  ['2268', 'FMST 1', 'FMST 20'],
  ['2278', 'FMST 100', 'FMST 102'],
  ['2280', 'FMST 105', 'SOCY 149'],
  ['2282', 'FMST 120', 'HIS 112'],
  ['2288', 'LIT 166E', 'FILM 165A'],
  ['2290', 'FMST 194A'],
)
const swap = (from: string, to: string, t = terms) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('feminist-studies-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('needs one lower-division FMST course besides FMST 1', () => {
    expect(find(run(harness, { terms: drop('FMST 20') }), 'ld-fmst').status).toBe('unmet')
  })

  it('needs seven upper-division electives', () => {
    expect(find(run(harness, { terms: drop('HIS 112') }), 'electives').status).toBe('unmet')
  })

  it('an unlisted non-FMST course is not an elective', () => {
    expect(find(run(harness, { terms: swap('HIS 112', 'HIS 100A') }), 'electives').status).toBe('unmet')
  })

  it('a listed cross-listed alias counts', () => {
    expect(failing(run(harness, { terms: swap('HIS 112', 'CRES 130') }))).toEqual([])
  })

  it('at least five FMST-designated courses; FMST 199 does not count toward the five', () => {
    // FMST courses: 1, 20, 100, 194A + FMST 199 → only four count.
    let t = swap('FMST 102', 'SOCY 120')
    t = swap('FMST 105', 'SOCY 121', t)
    t = swap('FMST 120', 'FMST 199', t)
    const r = run(harness, { terms: t })
    expect(find(r, 'electives').status).toBe('met')
    expect(find(r, 'fmst-five').status).toBe('unmet')
    expect(failing(r)).toEqual(['fmst-five:unmet'])
    // A course cross-listed with FMST (HIS 119 / FMST 119) counts toward the five.
    expect(find(run(harness, { terms: swap('SOCY 121', 'HIS 119', t) }), 'fmst-five').status).toBe('met')
  })

  it('one P/NP course is allowed, two are not', () => {
    expect(failing(run(harness, { terms, grades: { 'SOCY 149': 'P' } }))).toEqual([])
    const r = run(harness, { terms, grades: { 'SOCY 149': 'P', 'FMST 1': 'P' } })
    expect(failing(r)).toEqual(['letter-grades:unmet'])
  })

  it('FMST 100 and the comprehensive need letter grades', () => {
    expect(find(run(harness, { terms, grades: { 'FMST 100': 'P' } }), 'fmst100').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'FMST 194A': 'P' } }), 'comprehensive').status).toBe('unmet')
  })

  it('comprehensive: FMST 195 needs the thesis petition', () => {
    const t = swap('FMST 194A', 'FMST 195')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    const r = run(harness, { terms: t, attested: [] })
    expect(find(r, 'attest:thesis-petition').status).toBe('needs-attestation')
  })

  it('a CRES-primary senior seminar cross-listed as FMST 194 counts', () => {
    expect(failing(run(harness, { terms: swap('FMST 194A', 'CRES 190A') }))).toEqual([])
  })

  it('the senior seminar cannot also be an elective', () => {
    const r = run(harness, { terms: drop('FILM 165A') })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'comprehensive-course').status).toBe('met')
  })

  it('without a senior seminar DC and comprehensive fail', () => {
    const r = run(harness, { terms: drop('FMST 194A') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })
})

// Adversarial review (2026-10-06).
describe('feminist-studies-ba 2026-27 — review', () => {
  // A record with exactly five FMST courses: FMST 1, LD, 100, one elective, 194K.
  const five = plan(
    ['2268', 'FMST 1', 'FMST 20'],
    ['2278', 'FMST 100', 'FMST 102'],
    ['2280', 'SOCY 120', 'SOCY 149'],
    ['2282', 'SOCY 121', 'HIS 112'],
    ['2288', 'LIT 166E', 'FILM 165A'],
    ['2290', 'FMST 194K'],
  )

  it('a senior seminar entered under its CRES code (CRES 190K) is an FMST course toward the five', () => {
    // "Courses cross-listed with a FMST course will count toward this five-course minimum."
    expect(failing(run(harness, { terms: five }))).toEqual([])
    const r = run(harness, { terms: five.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'FMST 194K' ? 'CRES 190K' : c)) })) })
    expect(find(r, 'fmst-five').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('the lower-division course entered as VAST 01 (= FMST 71) counts toward the five', () => {
    const r = run(harness, { terms: five.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'FMST 20' ? 'VAST 01' : c)) })) })
    expect(find(r, 'ld-fmst').status).toBe('met')
    expect(find(r, 'fmst-five').status).toBe('met')
  })

  it('a non-FMST course cross-listed only with non-FMST codes does not count toward the five', () => {
    const r = run(harness, { terms: five.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'FMST 102' ? 'ECON 183' : c)) })) })
    expect(find(r, 'fmst-five').status).toBe('unmet')
  })

  it('empty plan is incomplete', () => {
    const r = run(harness, { terms: [], attested: [] })
    expect(verdict(r).complete).toBe(false)
  })

  it('a 2-credit FMST upper-division course is not one of the seven electives', () => {
    expect(find(run(harness, { terms: swap('FILM 165A', 'FMST 193F') }), 'electives').status).toBe('unmet')
  })

  it('an extra senior seminar may be an elective', () => {
    expect(failing(run(harness, { terms: swap('FILM 165A', 'FMST 194B') }))).toEqual([])
  })

  it('the one P/NP course may be an elective, not FMST 100', () => {
    expect(failing(run(harness, { terms, grades: { 'FMST 102': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms, grades: { 'FMST 100': 'P' } }), 'fmst100').status).toBe('unmet')
  })

  it('transfer (no-term) FMST 1 counts', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'FMST 1') }))
    expect(failing(run(harness, { terms: t, completed: ['FMST 1'] }))).toEqual([])
  })

  it('planned seminar is in progress', () => {
    const r = run(harness, { terms, currentTerm: '2290' })
    expect(find(r, 'comprehensive').status).toBe('in-progress')
  })
})
