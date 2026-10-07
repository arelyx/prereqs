import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// CRES 10, CRES 100/101, six listed electives, CRES 190B seminar.
// Electives: CRES 68 (LD; Transnational + Social Movements), CRES 118 (General),
// CRES 131 (SM), CRES 150 (General), CRES 173 (T + SM), CRES 188M (T).
const terms = plan(
  ['2268', 'CRES 10'],
  ['2270', 'CRES 68', 'CRES 100'],
  ['2272', 'CRES 101'],
  ['2278', 'CRES 118', 'CRES 131'],
  ['2280', 'CRES 150', 'CRES 173'],
  ['2282', 'CRES 188M', 'CRES 190B'],
)
const swap = (from: string, to: string, t = terms) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string, t = terms) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('critical-race-and-ethnic-studies-ba 2025-26', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('CRES 10, 100 and 101 are required', () => {
    expect(find(run(harness, { terms: drop('CRES 10') }), 'cres10').status).toBe('unmet')
    const r = run(harness, { terms: drop('CRES 101') })
    expect(find(r, 'core').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('a course cross-listed with CRES counts like a CRES course', () => {
    // ANTH 130F [/CRES 130] is Transnational and Social Movements
    expect(failing(run(harness, { terms: swap('CRES 173', 'ANTH 130F') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CRES 173', 'CRES 130') }))).toEqual([])
  })

  it('grade below C does not count; P does', () => {
    expect(find(run(harness, { terms, grades: { 'CRES 100': 'C-' } }), 'core').status).toBe('unmet')
    expect(failing(run(harness, { terms, grades: { 'CRES 100': 'P' } }))).toEqual([])
  })

  it('a listed seminar outside CRES satisfies the comprehensive', () => {
    expect(find(run(harness, { terms: swap('CRES 190B', 'FMST 194K') }), 'comprehensive').status).toBe('met')
    expect(find(run(harness, { terms: swap('CRES 190B', 'CRES 190K') }), 'comprehensive').status).toBe('met')
  })

  it('any CRES 190-series course satisfies the comprehensive', () => {
    expect(find(run(harness, { terms: swap('CRES 190B', 'CRES 190W') }), 'comprehensive').status).toBe('met')
  })

  it('CRES 101 (DC) must be completed before the senior seminar', () => {
    const same = terms.map((q) => (q.term === '2272' ? { ...q, courses: [] } : q.term === '2282' ? { ...q, courses: [...q.courses, 'CRES 101'] } : q))
    expect(find(run(harness, { terms: same }), 'comprehensive').status).toBe('unmet')
  })

  it('the seminar used for the comprehensive is not also an elective (10 courses)', () => {
    // CRES 190Y is on the Transnational and Social Movements lists; as the only seminar it is the comprehensive.
    const t = swap('CRES 190B', 'CRES 190Y', drop('CRES 150'))
    const r = run(harness, { terms: t })
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('empty plan is incomplete', () => {
    expect(verdict(run(harness, { terms: [] })).complete).toBe(false)
  })

  it('a D in an elective does not count', () => {
    expect(find(run(harness, { terms, grades: { 'CRES 150': 'D' } }), 'electives').status).toBe('unmet')
  })

  it('transfer (no-term) CRES 10 counts', () => {
    expect(failing(run(harness, { terms: drop('CRES 10'), completed: ['CRES 10'] }))).toEqual([])
  })
})

describe('critical-race-and-ethnic-studies-ba 2025-26 — rules that differ from 2026-27', () => {
  it('2025-26: six electives from the printed lists (five is one short)', () => {
    expect(find(run(harness, { terms: drop('CRES 150') }), 'electives').status).toBe('unmet')
  })

  it('2025-26: a course not on the printed lists does not count (no external-list cannot-check)', () => {
    const r = run(harness, { terms: swap('CRES 150', 'HIS 121A') })
    expect(find(r, 'electives').status).toBe('unmet')
    // a listed non-CRES course counts outright
    expect(failing(run(harness, { terms: swap('CRES 150', 'EDUC 181') }))).toEqual([])
  })

  it('2025-26: at least two Transnational courses, from the printed list', () => {
    // CRES 188M -> CRES 161 (General): Transnational left = CRES 68, CRES 173
    expect(failing(run(harness, { terms: swap('CRES 188M', 'CRES 161') }))).toEqual([])
    // and CRES 173 -> CRES 131? use CRES 132 (SM only): only CRES 68 is Transnational
    const r = run(harness, { terms: swap('CRES 173', 'CRES 132', swap('CRES 188M', 'CRES 161')) })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'transnational').status).toBe('unmet')
  })

  it('2025-26: at least one Social Movements course; one course may be both Transnational and Social Movements', () => {
    // Remove every SM course except CRES 173 (T + SM): still met
    let t = swap('CRES 131', 'CRES 161')
    t = swap('CRES 68', 'CRES 60E', t) // CRES 60E: Transnational only
    expect(failing(run(harness, { terms: t }))).toEqual([])
    // ...and without CRES 173 no Social Movements course remains
    const r = run(harness, { terms: swap('CRES 173', 'CRES 188A', t) })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'social-movements').status).toBe('unmet')
  })

  it('2025-26: at least two CRES courses among the electives', () => {
    let t = swap('CRES 118', 'EDUC 181')
    t = swap('CRES 131', 'HIS 121B', t)
    t = swap('CRES 150', 'LIT 161A', t)
    t = swap('CRES 188M', 'HIS 154', t)
    // CRES 68 and CRES 173 remain: two CRES courses
    expect(failing(run(harness, { terms: t }))).toEqual([])
    const r = run(harness, { terms: swap('CRES 173', 'LALS 170', t) })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'two-cres').status).toBe('unmet')
  })

  it('2025-26: no more than one lower-division elective', () => {
    // add CRES 45 (LD) in place of CRES 150: two LD electives
    const r = run(harness, { terms: swap('CRES 150', 'CRES 45') })
    expect(find(r, 'electives').status).toBe('unmet')
    // a lower-division course is optional: all six upper-division is fine
    expect(failing(run(harness, { terms: swap('CRES 68', 'CRES 115') }))).toEqual([])
  })

  it('2025-26: an extra senior seminar on a printed list may be a Transnational course', () => {
    // FMST 194U [/CRES 190U] is on the Transnational list; CRES 190B is the comprehensive.
    expect(failing(run(harness, { terms: swap('CRES 188M', 'FMST 194U') }))).toEqual([])
    // ...under its CRES code too (CRES 190U = FMST 194U)
    expect(failing(run(harness, { terms: swap('CRES 188M', 'CRES 190U') }))).toEqual([])
  })

  it('2025-26: FMST 145 counts toward the two CRES courses through its catalog cross-listing', () => {
    let t = swap('CRES 118', 'EDUC 181')
    t = swap('CRES 131', 'HIS 121B', t)
    t = swap('CRES 150', 'LIT 161A', t)
    t = swap('CRES 188M', 'HIS 154', t)
    t = swap('CRES 173', 'FMST 145', t)
    // CRES 68 + FMST 145 (= CRES 145); Transnational CRES 68 + HIS 154; SM CRES 68 + HIS 121B
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
