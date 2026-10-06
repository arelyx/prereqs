import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// General: 3 LD + FILM 120 + Groups 1-3 + comprehensive + 5 electives.
const general = plan(
  ['2268', 'FILM 20A', 'FILM 20B'],
  ['2270', 'FILM 20P'],
  ['2278', 'FILM 120', 'FILM 132A'],
  ['2280', 'FILM 134A', 'FILM 136D'],
  ['2282', 'FILM 145', 'FILM 150'],
  ['2288', 'FILM 160', 'FILM 180'],
  ['2290', 'FILM 171A', 'FILM 194A'],
)
const G = { concentration: 'general' }
const swap = (terms: typeof general, from: string, to: string | null) =>
  terms.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('film-and-digital-media-ba 2025-26 general', () => {
  it('complete record (FILM 132A doubles as core + diversity; FILM 132A/134A + 194A cover DC)', () => {
    expect(failing(run(harness, { terms: general, choices: G }))).toEqual([])
  })

  it('needs a concentration choice', () => {
    expect(run(harness, { terms: general }).nodes[0].status).toBe('needs-choice')
  })

  it('core courses must come from three different groups', () => {
    const t = swap(general, 'FILM 136D', 'FILM 134B') // two from Group 2, none from 3
    expect(find(run(harness, { terms: t, choices: G }), 'core-g3').status).toBe('unmet')
  })

  it('2025-26: FILM 170A is not a core group course (no Group 4); Group 3 is required', () => {
    // 2026-27 accepted Groups 1, 2 and 4; 2025-26 needs one from each of Groups 1-3.
    const t = swap(general, 'FILM 136D', 'FILM 170A')
    const r = run(harness, { terms: t, choices: G })
    expect(find(r, 'core-g3').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met') // FILM 170A is still a 170-series elective
  })

  it('diversity requirement is needed', () => {
    const t = swap(general, 'FILM 132A', 'FILM 130')
    const r = run(harness, { terms: t, choices: G })
    expect(find(r, 'diversity').status).toBe('unmet')
    expect(find(r, 'core-g1').status).toBe('met')
  })

  it('grades below C do not count; P does', () => {
    expect(find(run(harness, { terms: general, choices: G, grades: { 'FILM 120': 'C-' } }), 'film120').status).toBe('unmet')
    expect(find(run(harness, { terms: general, choices: G, grades: { 'FILM 120': 'P' } }), 'film120').status).toBe('met')
  })

  it('FILM 185F does not count as an elective', () => {
    const t = swap(general, 'FILM 180', 'FILM 185F')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('unmet')
  })

  it('an extra core course counts as elective only after its group core course', () => {
    const later = swap(general, 'FILM 180', 'FILM 132B') // 132B in 2288, after 132A in 2278
    expect(find(run(harness, { terms: later, choices: G }), 'electives').status).toBe('met')
    // Same-quarter 132A + 132B: neither was taken after the other's core course
    const same = swap(general, 'FILM 180', null).map((q) => (q.term === '2278' ? { ...q, courses: [...q.courses, 'FILM 132B'] } : q))
    expect(find(run(harness, { terms: same, choices: G }), 'electives').status).toBe('unmet')
  })

  it('a second senior seminar is not an elective', () => {
    const t = swap(general, 'FILM 180', 'FILM 194B')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('unmet')
  })

  it('DC needs one course from each category', () => {
    // core groups via 136A (G3), 134A (G2) is DC first category… remove both first-category courses
    const t = swap(swap(general, 'FILM 132A', 'FILM 136A'), 'FILM 134A', 'FILM 165A')
    const r = run(harness, { terms: t, choices: G })
    expect(find(r, 'dc-first').status).toBe('unmet')
  })
})

describe('film-and-digital-media-ba 2025-26 ICPC', () => {
  const icpc = plan(
    ['2268', 'FILM 20A', 'FILM 20B'],
    ['2270', 'FILM 20C'],
    ['2278', 'FILM 120', 'FILM 130', 'FILM 134A'],
    ['2280', 'FILM 136A', 'FILM 170B', 'FILM 194A'],
    ['2282', 'FILM 165B', 'FILM 180'],
    ['2288', 'FILM 150', 'FILM 172', 'FILM 175'],
    ['2290', 'FILM 199', 'FILM 196A'],
  )
  const I = { concentration: 'ICPC' }

  it('complete ICPC record', () => {
    expect(failing(run(harness, { terms: icpc, choices: I }))).toEqual([])
  })

  it('admission is an attestation', () => {
    const r = run(harness, { terms: icpc, choices: I, attested: [] })
    expect(find(r, 'attest:icpc-admission').status).toBe('needs-attestation')
  })

  it('needs FILM 199 plus a senior project', () => {
    expect(find(run(harness, { terms: swap(icpc, 'FILM 199', null), choices: I }), 'film199').status).toBe('unmet')
  })

  it('Group 4 course cannot double as a production elective', () => {
    // Only two other production courses + FILM 170B: groups need 170B → production short
    const t = swap(icpc, 'FILM 175', null)
    const r = run(harness, { terms: t, choices: I })
    expect([find(r, 'icpc-g4').status, find(r, 'production').status]).toContain('unmet')
  })

  it('2025-26: FILM 145 is a critical studies course; FILM 152 is not', () => {
    const t = swap(icpc, 'FILM 180', 'FILM 145')
    expect(find(run(harness, { terms: t, choices: I }), 'critical').status).toBe('met')
    const u = swap(icpc, 'FILM 180', 'FILM 152')
    expect(find(run(harness, { terms: u, choices: I }), 'critical').status).toBe('unmet')
  })

  it('every one of the five groups is required', () => {
    expect(find(run(harness, { terms: swap(icpc, 'FILM 194A', null), choices: I }), 'icpc-g5').status).toBe('unmet')
  })
})
