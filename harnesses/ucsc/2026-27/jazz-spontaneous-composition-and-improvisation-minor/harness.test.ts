import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
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

// Adversarial review (2026-10-06).
describe('jazz minor 2026-27 — review', () => {
  it('empty plan is incomplete and asks for the placement only as the MUSC 14 alternative', () => {
    const r = run(harness, { terms: [], attested: [] })
    expect(verdict(r).complete).toBe(false)
    expect(find(r, 'theory/musc30a').status).toBe('unmet')
  })

  it('placement waives MUSC 14 but never MUSC 30A', () => {
    const r = run(harness, { terms: swap(swap(terms, 'MUSC 14', null), 'MUSC 30A', null), attested: ['theory placement'] })
    expect(find(r, 'theory/musc14').status).toBe('met')
    expect(find(r, 'theory/musc30a').status).toBe('unmet')
  })

  it('MUSC 3 ×2 in place of MUSC 74, with the other ensembles all MUSC 164', () => {
    const t = plan(
      ['2268', 'MUSC 11C', 'MUSC 3'], ['2270', 'MUSC 14', 'MUSC 3', 'MUSC 150K'], ['2272', 'MUSC 150Z', 'MUSC 164'],
      ['2278', 'MUSC 30A', 'MUSC 31', 'MUSC 164'], ['2280', 'MUSC 105C', 'MUSC 164'], ['2282', 'MUSC 121A', 'MUSC 164'],
    )
    expect(failing(run(harness, { terms: t }))).toEqual([])
    // five ensemble quarters in all is one short
    const five = t.map((q) => (q.term === '2282' ? { ...q, courses: ['MUSC 121A'] } : q))
    expect(find(run(harness, { terms: five }), 'elective-ensembles').status).toBe('unmet')
  })

  it('a graduate elective taken P/NP does not count', () => {
    const t = swap(terms, 'MUSC 121A', 'MUSC 203F')
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('met')
    expect(find(run(harness, { terms: t, grades: { 'MUSC 203F': 'P' } }), 'ud-electives').status).toBe('unmet')
  })

  it('an upper-division elective ensemble taken P/NP does not count; a lower-division one does', () => {
    expect(find(run(harness, { terms, grades: { 'MUSC 165': 'P' } }), 'elective-ensembles').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'MUSC 5A': 'P' } }), 'elective-ensembles').status).toBe('met')
  })

  it('an ensemble not on the list (MUSC 159A) is not an elective ensemble', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 165', 'MUSC 159A') }), 'elective-ensembles').status).toBe('unmet')
  })

  it('transfer (no-term) MUSC 30A and 31 count', () => {
    const t = swap(swap(terms, 'MUSC 30A', null), 'MUSC 31', null)
    expect(failing(run(harness, { terms: t, completed: ['MUSC 30A', 'MUSC 31'] }))).toEqual([])
  })

  it('planned courses are in progress', () => {
    const r = run(harness, { terms, currentTerm: '2282' })
    expect(find(r, 'ud-electives').status).toBe('in-progress')
    expect(verdict(r).complete).toBe(false)
  })

  it('kitchen sink plan is complete', () => {
    const t = plan(
      ['2268', 'MUSC 11B', 'MUSC 11C', 'MUSC 11E', 'MUSC 14', 'MUSC 20C', 'MUSC 74', 'MUSC 3', 'MUSC 164'],
      ['2270', 'MUSC 30A', 'MUSC 31', 'MUSC 150J', 'MUSC 150K', 'MUSC 3', 'MUSC 164'],
      ['2272', 'MUSC 101C', 'MUSC 105A', 'MUSC 105C', 'MUSC 105H', 'MUSC 1C', 'MUSC 2', 'MUSC 168'],
    )
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual([])
  })
})
