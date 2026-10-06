import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Constitutional: POLI 111A; Global: POLI 160B; thematic: A LGST 109, PHIL 144;
// B LGST 152, LGST 156; C LGST 108, SOCY 122; capstone LGST 196.
const base = plan(
  ['2268', 'LGST 10', 'PHIL 22'],
  ['2278', 'POLI 111A', 'POLI 160B'],
  ['2280', 'LGST 109', 'PHIL 144', 'LGST 152'],
  ['2282', 'LGST 156', 'LGST 108', 'SOCY 122'],
  ['2288', 'LGST 196'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)
const drop = (t: Terms, code: string) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('legal-studies-ba 2025-26', () => {
  it('2025-26: History of Ethics (PHIL 140, now PHIL 100D / LGST 140P) is a Theory course', () => {
    for (const c of ['PHIL 140', 'PHIL 100D', 'LGST 140P'])
      expect(find(run(harness, { terms: swap('LGST 109', c) }), 'thematic').status).toBe('met')
  })

  it('2025-26: SPAN 130 is not a Law and Society course', () => {
    expect(find(run(harness, { terms: swap('SOCY 122', 'SPAN 130') }), 'thematic').status).toBe('unmet')
  })

  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('needs one of the philosophy logic/ethics courses', () => {
    expect(find(run(harness, { terms: swap('PHIL 22', 'PHIL 11') }), 'philosophy').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('PHIL 22', 'PHIL 9') }), 'philosophy').status).toBe('met')
  })

  it('constitutional law: cross-listed LGST 111A counts as POLI 111A', () => {
    expect(find(run(harness, { terms: swap('POLI 111A', 'LGST 111A') }), 'conlaw').status).toBe('met')
    expect(find(run(harness, { terms: drop(base, 'POLI 111A') }), 'conlaw').status).toBe('unmet')
  })

  it('global law is required', () => {
    expect(find(run(harness, { terms: swap('POLI 160B', 'POLI 160A') }), 'global').status).toBe('unmet')
  })

  it('six thematic courses with at least one per area', () => {
    // replace the theory courses with law-and-society courses: no Theory
    const t = swapIn(swap('LGST 109', 'LGST 113'), 'PHIL 144', 'LGST 114')
    const n = find(run(harness, { terms: t }), 'thematic')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/A\. Theory: 0 of 1/)
  })

  it('five thematic courses is not enough', () => {
    expect(find(run(harness, { terms: drop(base, 'SOCY 122') }), 'thematic').status).toBe('unmet')
  })

  it('LGST 188A + OAKS 188B count as one course together, never alone', () => {
    const t = swap('LGST 156', 'LGST 188A')
    expect(find(run(harness, { terms: t }), 'thematic').status).toBe('unmet')
    t.push({ term: '2290', courses: ['OAKS 188B'] })
    expect(find(run(harness, { terms: t }), 'thematic').status).toBe('met')
  })

  it('a constitutional-law course is not reused as a thematic course', () => {
    // POLI 111A is also on the Public Law list, but it fills Constitutional Law
    expect(find(run(harness, { terms: drop(base, 'LGST 156') }), 'thematic').status).toBe('unmet')
    // a second constitutional-law course can be a thematic course
    const t = drop(base, 'LGST 156')
    t.push({ term: '2290', courses: ['LGST 111C'] })
    expect(find(run(harness, { terms: t }), 'thematic').status).toBe('met')
  })

  it('DC / comprehensive: capstone or a two-quarter thesis', () => {
    const t = swap('LGST 196', 'LGST 195A')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
    t.push({ term: '2290', courses: ['LGST 195B'] })
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('up to three LGST courses P/NP; a fourth is too many', () => {
    const three = { 'LGST 109': 'P', 'LGST 152': 'P', 'LGST 156': 'P' }
    expect(find(run(harness, { terms: base, grades: three }), 'pnp-limit').status).toBe('met')
    const four = { ...three, 'LGST 108': 'P' }
    expect(find(run(harness, { terms: base, grades: four }), 'pnp-limit').status).toBe('unmet')
  })

  it('four P/NP courses where only three are LGST: cannot tell which courses the limit covers', () => {
    const g = { 'LGST 109': 'P', 'LGST 152': 'P', 'LGST 156': 'P', 'PHIL 22': 'P' }
    expect(find(run(harness, { terms: base, grades: g }), 'pnp-limit').status).toBe('cannot-check')
  })

  it('a course on two theme lists covers only one area (strict), else cannot-check', () => {
    // LGST 153 is on B and C. Make it the only B and C course.
    let t = swapIn(swapIn(swapIn(swap('LGST 152', 'LGST 153'), 'LGST 156', 'LGST 107'), 'LGST 108', 'LGST 146'), 'SOCY 122', 'POLI 103')
    // thematic: A LGST 109, PHIL 144, LGST 107, LGST 146, POLI 103 + LGST 153 (B and C)
    const r = run(harness, { terms: t })
    expect(find(r, 'thematic').status).toBe('cannot-check')
  })

  it('a second global-law course counts as a Public Law thematic course', () => {
    // POLI 175 is Global Law; LGST 116 (also Global Law) can be a B course
    const t = swapIn(swapIn(base, 'POLI 160B', 'POLI 175'), 'LGST 156', 'LGST 116')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('NP never counts', () => {
    expect(find(run(harness, { terms: base, grades: { 'LGST 10': 'NP' } }), 'lgst10').status).toBe('unmet')
  })

  it('review: cross-listed partner codes (LGST 116 entered as POLI 116, POLI 175 as LGST 175) count', () => {
    const t = swapIn(swapIn(base, 'POLI 160B', 'LGST 175'), 'LGST 156', 'POLI 116')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('review: OAKS 188A + LGST 188B (partner codes) also count as the one pair course', () => {
    const t = swap('LGST 156', 'OAKS 188A')
    t.push({ term: '2290', courses: ['LGST 188B'] })
    expect(find(run(harness, { terms: t }), 'thematic').status).toBe('met')
  })

  it('review: an independent study counts as a thematic course only by petition', () => {
    // "Students may petition the department to substitute only one upper-division independent study or field study toward the elective requirement"
    const t = swap('SOCY 122', 'LGST 199')
    expect(find(run(harness, { terms: t, attested: [] }), 'thematic-petition').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['independent-petition'] }), 'thematic-petition').status).toBe('met')
    // not asked when six listed courses exist
    const r = run(harness, { terms: [...base, { term: '2290', courses: ['LGST 199'] }], attested: [] })
    expect(failing(r)).toEqual([])
  })

  it('review: only one independent / field study may substitute', () => {
    const t = swapIn(swap('SOCY 122', 'LGST 199'), 'LGST 152', 'LGST 198')
    expect(find(run(harness, { terms: t }), 'thematic').status).toBe('unmet')
  })

  it('review: an independent study does not cover a thematic area', () => {
    // only C course replaced by LGST 199 (plus an extra B): no Law and Society course
    const t = swapIn(swapIn(base, 'SOCY 122', 'LGST 199'), 'LGST 108', 'LGST 124')
    expect(find(run(harness, { terms: t }), 'thematic').status).toBe('unmet')
  })

  it('review: P/NP limit counts LGST courses entered under a partner code', () => {
    // POLI 116 is LGST 116 (cross-listed) — it is an LGST course for the limit
    const t = swapIn(base, 'LGST 156', 'POLI 116')
    const g = { 'LGST 109': 'P', 'LGST 152': 'P', 'POLI 116': 'P', 'LGST 108': 'P' }
    expect(find(run(harness, { terms: t, grades: g }), 'pnp-limit').status).toBe('unmet')
  })

  it('review: thesis needs two quarters; LGST 195A alone is not the comprehensive', () => {
    expect(find(run(harness, { terms: swap('LGST 196', 'LGST 195A') }), 'comprehensive').status).toBe('unmet')
  })

  it('review: empty plan is unmet', () => {
    expect(run(harness, { terms: [] }).status).toBe('unmet')
  })
})
