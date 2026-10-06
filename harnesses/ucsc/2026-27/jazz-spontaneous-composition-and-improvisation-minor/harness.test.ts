import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// The page's two-year planner.
const terms = plan(
  ['2268', 'MUSC 11B', 'MUSC 74', 'MUSC 3'],
  ['2270', 'MUSC 14', 'MUSC 150J', 'MUSC 164'],
  ['2272', 'MUSC 150Z', 'MUSC 3'],
  ['2278', 'MUSC 30A', 'MUSC 31', 'MUSC 2'],
  ['2280', 'MUSC 105C', 'MUSC 5A'],
  ['2282', 'MUSC 121A', 'MUSC 165'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('jazz-spontaneous-composition-and-improvisation-minor 2026-27', () => {
  it('complete planner record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('MUSC 14 is waived only by placement', () => {
    const t = swap(terms, 'MUSC 14', null)
    expect(find(run(harness, { terms: t, attested: [] }), 'theory/musc14').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['theory placement'] }), 'theory/musc14').status).toBe('met')
  })

  it('MUSC 30A and MUSC 31 are required', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 30A', null) }), 'theory/musc30a').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'MUSC 31', null) }), 'musc31').status).toBe('unmet')
  })

  it('two quarters of MUSC 3 replace MUSC 74 and also count as jazz-ensemble quarters', () => {
    // Drop MUSC 74; MUSC 3 ×2 + MUSC 164 ×1 = three jazz quarters, and the LD requirement.
    const t = swap(terms, 'MUSC 74', null)
    const r = run(harness, { terms: t })
    expect(find(r, 'ld-improv').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('only one MUSC 3 quarter does not replace MUSC 74/20C', () => {
    const t = swap(swap(terms, 'MUSC 74', null), 'MUSC 3', 'MUSC 164')
    expect(find(run(harness, { terms: t }), 'ld-improv').status).toBe('unmet')
  })

  it('three jazz-ensemble quarters are needed', () => {
    const t = swap(terms, 'MUSC 164', null)
    expect(find(run(harness, { terms: t }), 'jazz-ensembles').status).toBe('unmet')
  })

  it('a jazz ensemble cannot count as both a jazz quarter and an elective ensemble', () => {
    // Replace the three elective ensembles with two more MUSC 164s: 5 jazz enrollments, need 6 total.
    const t = swap(swap(swap(terms, 'MUSC 2', 'MUSC 164'), 'MUSC 5A', 'MUSC 164'), 'MUSC 165', null)
    expect(find(run(harness, { terms: t }), 'elective-ensembles').status).toBe('unmet')
    // With a sixth MUSC 164 everything is met (MUSC 164 is on the elective list).
    const t2 = swap(swap(terms, 'MUSC 2', 'MUSC 164'), 'MUSC 5A', 'MUSC 164')
    expect(failing(run(harness, { terms: t2 }))).toEqual([])
  })

  it('UD theory course cannot also be an elective', () => {
    // 150J fills UD theory; electives then need three others.
    const t = swap(terms, 'MUSC 121A', null)
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
    // A second theory course (150K) can be an elective.
    expect(find(run(harness, { terms: swap(terms, 'MUSC 121A', 'MUSC 150K') }), 'ud-electives').status).toBe('met')
  })

  it('upper-division courses, including MUSC 164, need a letter grade', () => {
    expect(find(run(harness, { terms, grades: { 'MUSC 150Z': 'P' } }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'MUSC 164': 'P' } }), 'jazz-ensembles').status).toBe('unmet')
    expect(failing(run(harness, { terms, grades: { 'MUSC 3': 'P', 'MUSC 14': 'P', 'MUSC 11B': 'P', 'MUSC 2': 'P' } }))).toEqual([])
  })

  it('MUSC 11A is not a jazz-minor history course', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 11B', 'MUSC 11A') }), 'history').status).toBe('unmet')
  })
})
