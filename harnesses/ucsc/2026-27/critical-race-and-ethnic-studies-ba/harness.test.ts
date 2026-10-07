import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// CRES 10 + CRES 68, CRES 100/101, five upper-division CRES electives, CRES 190B seminar.
const terms = plan(
  ['2268', 'CRES 10'],
  ['2270', 'CRES 68', 'CRES 100'],
  ['2272', 'CRES 101'],
  ['2278', 'CRES 118', 'CRES 131'],
  ['2280', 'CRES 150', 'CRES 173'],
  ['2282', 'CRES 188M', 'CRES 190B'],
)
const choices = { transnational_1: 'CRES 173', transnational_2: 'CRES 188M', social_movements: 'CRES 131' }
const swap = (from: string, to: string, t = terms) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('critical-race-and-ethnic-studies-ba 2026-27', () => {
  it('complete record with list assignments', () => {
    expect(failing(run(harness, { terms, choices }))).toEqual([])
  })

  it('without list assignments the breadth slots are cannot-check, not met', () => {
    const r = run(harness, { terms })
    expect(find(r, 'breadth-transnational_1').status).toBe('cannot-check')
    expect(find(r, 'breadth-social_movements').status).toBe('cannot-check')
    expect(find(r, 'ud-electives').status).toBe('met')
  })

  it('a non-CRES elective must be checked against the external list', () => {
    const r = run(harness, { terms: swap('CRES 150', 'HIS 121B'), choices })
    expect(find(r, 'ud-electives').status).toBe('cannot-check')
    expect(find(r, 'ud-electives').detail).toMatch(/HIS 121B/)
  })

  it('a course cross-listed with CRES counts like a CRES course', () => {
    expect(failing(run(harness, { terms: swap('CRES 150', 'ANTH 130F'), choices }))).toEqual([])
  })

  it('five upper-division electives are required; the seminar is not one of them', () => {
    const r = run(harness, { terms: drop('CRES 150'), choices })
    expect(find(r, 'ud-electives').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('an extra senior seminar counts as an elective', () => {
    expect(failing(run(harness, { terms: swap('CRES 150', 'CRES 190C'), choices }))).toEqual([])
  })

  it('the senior comprehensive course cannot be a Transnational course', () => {
    const r = run(harness, { terms, choices: { ...choices, transnational_2: 'CRES 190B' } })
    expect(find(r, 'breadth-transnational_2').status).toBe('unmet')
  })

  it('the two Transnational courses must differ; one course may be Transnational and Social Movements', () => {
    expect(find(run(harness, { terms, choices: { ...choices, transnational_2: 'CRES 173' } }), 'breadth-transnational_2').status).toBe('unmet')
    expect(failing(run(harness, { terms, choices: { ...choices, social_movements: 'CRES 173' } }))).toEqual([])
  })

  it('the lower-division elective may be Transnational, and may be an extra upper-division CRES course', () => {
    expect(failing(run(harness, { terms, choices: { ...choices, transnational_1: 'CRES 68' } }))).toEqual([])
    const t = swap('CRES 68', 'CRES 129')
    expect(failing(run(harness, { terms: t, choices }))).toEqual([])
    // ...but not a non-CRES upper-division course: a CRES course moves to the
    // lower-division slot and the HIS course must be checked as an elective.
    const r = run(harness, { terms: swap('CRES 68', 'HIS 121B'), choices: { ...choices, transnational_1: 'CRES 118' } })
    expect(find(r, 'ld-elective').used?.[0].display).toMatch(/^CRES 1/)
    expect(find(r, 'ud-electives').status).toBe('cannot-check')
    // one course short overall: the lower-division slot or the electives is unmet
    const t2 = swap('CRES 68', 'HIS 121B').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CRES 118') }))
    expect(failing(run(harness, { terms: t2, choices })).some((x) => x.endsWith(':unmet'))).toBe(true)
  })

  it('one upper-division CRES course is required among the electives', () => {
    let t = swap('CRES 118', 'HIS 121A')
    t = swap('CRES 131', 'HIS 121B', t)
    t = swap('CRES 150', 'LALS 150', t)
    t = swap('CRES 173', 'LIT 161A', t)
    t = swap('CRES 188M', 'SOCY 170P', t)
    const r = run(harness, { terms: t, choices: { transnational_1: 'HIS 121A', transnational_2: 'HIS 121B', social_movements: 'LIT 161A' } })
    expect(find(r, 'one-cres-ud').status).toBe('unmet')
  })

  it('grade below C does not count; P does', () => {
    expect(find(run(harness, { terms, choices, grades: { 'CRES 100': 'C-' } }), 'core').status).toBe('unmet')
    expect(failing(run(harness, { terms, choices, grades: { 'CRES 100': 'P' } }))).toEqual([])
  })

  it('a listed seminar outside CRES satisfies the comprehensive', () => {
    expect(find(run(harness, { terms: swap('CRES 190B', 'FMST 194K'), choices }), 'comprehensive').status).toBe('met')
  })

  it('CRES 101 is required (core and DC)', () => {
    const r = run(harness, { terms: drop('CRES 101'), choices })
    expect(find(r, 'core').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('CRES independent study counts only by petition (cannot-check)', () => {
    const n = find(run(harness, { terms: swap('CRES 150', 'CRES 199'), choices }), 'ud-electives')
    expect(n.status).toBe('cannot-check')
    expect(n.detail).toMatch(/petition/)
  })
})

// Adversarial review (2026-10-06).
describe('critical-race-and-ethnic-studies-ba 2026-27 — review', () => {
  it('an additional senior seminar counted as an elective cannot be a Transnational course', () => {
    // "Senior comprehensive courses do not count toward the transnational or social movements requirements."
    const t = swap('CRES 150', 'CRES 190C')
    expect(find(run(harness, { terms: t, choices }), 'ud-electives').status).toBe('met')
    const r = run(harness, { terms: t, choices: { ...choices, transnational_1: 'CRES 190C' } })
    expect(find(r, 'breadth-transnational_1').status).toBe('unmet')
    const r2 = run(harness, { terms: t, choices: { ...choices, social_movements: 'CRES 190C' } })
    expect(find(r2, 'breadth-social_movements').status).toBe('unmet')
  })

  it('CRES 101 (DC) must be completed before the senior seminar', () => {
    // "Students must complete their DC requirement prior to the Senior Seminar."
    const same = terms.map((q) => (q.term === '2272' ? { ...q, courses: [] } : q.term === '2282' ? { ...q, courses: [...q.courses, 'CRES 101'] } : q))
    const n = find(run(harness, { terms: same, choices }), 'comprehensive')
    expect(n.status).toBe('unmet')
    expect(failing(run(harness, { terms, choices }))).toEqual([])
  })

  it('a breadth course declared under its cross-listed code matches the course taken', () => {
    const t = swap('CRES 173', 'ANTH 130F')
    expect(failing(run(harness, { terms: t, choices: { ...choices, transnational_1: 'CRES 130' } }))).toEqual([])
    // ...and the same course under two codes is not two Transnational courses
    const r = run(harness, { terms: t, choices: { ...choices, transnational_1: 'CRES 130', transnational_2: 'ANTH 130F' } })
    expect(find(r, 'breadth-transnational_2').status).toBe('unmet')
  })

  it('a lower-division elective entered under its cross-listed code (SOCY 12 = CRES 12) counts', () => {
    expect(find(run(harness, { terms: swap('CRES 68', 'SOCY 12'), choices }), 'ld-elective').status).toBe('met')
  })

  it('a seminar entered under its CRES code (CRES 190K = FMST 194K) satisfies the comprehensive', () => {
    expect(find(run(harness, { terms: swap('CRES 190B', 'CRES 190K'), choices }), 'comprehensive').status).toBe('met')
  })

  it('empty plan is incomplete', () => {
    const r = run(harness, { terms: [] })
    expect(verdict(r).complete).toBe(false)
    expect(find(r, 'breadth-transnational_1').status).toBe('unmet')
  })

  it('a D in an elective does not count', () => {
    expect(find(run(harness, { terms, choices, grades: { 'CRES 150': 'D' } }), 'ud-electives').status).toBe('unmet')
  })

  it('transfer (no-term) CRES 10 counts', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CRES 10') }))
    expect(failing(run(harness, { terms: t, choices, completed: ['CRES 10'] }))).toEqual([])
  })
})
