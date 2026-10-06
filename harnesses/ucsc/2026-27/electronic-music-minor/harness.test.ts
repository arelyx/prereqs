import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Roughly the page's two-year planner.
const terms = plan(
  ['2268', 'MUSC 80C', 'CSE 20', 'MUSC 73'],
  ['2270', 'MUSC 123A', 'MUSC 14'],
  ['2272', 'MUSC 123B', 'MUSC 80L'],
  ['2278', 'MUSC 123C', 'MUSC 167R'],
  ['2280', 'MUSC 150Z', 'MUSC 167'],
  ['2282', 'MUSC 11B'],
)
const swap = (from: string, to: string | null) =>
  terms.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('electronic-music-minor 2026-27', () => {
  it('complete planner record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('MUSC 80C is required', () => {
    expect(find(run(harness, { terms: swap('MUSC 80C', null) }), 'history').status).toBe('unmet')
  })

  it('theory: MUSC 14, or placement into MUSC 30A', () => {
    const t = swap('MUSC 14', null)
    expect(find(run(harness, { terms: t, attested: [] }), 'theory').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['theory placement'] }), 'theory').status).toBe('met')
    expect(find(run(harness, { terms: swap('MUSC 14', 'MUSC 30A'), attested: [] }), 'theory').status).toBe('met')
  })

  it('programming: a list course, or the CSE 20 test-out', () => {
    const t = swap('CSE 20', null)
    expect(find(run(harness, { terms: t, attested: [] }), 'programming').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['cse 20 test-out'] }), 'programming').status).toBe('met')
    expect(find(run(harness, { terms: swap('CSE 20', 'ECE 153'), attested: [] }), 'programming').status).toBe('met')
  })

  it('needs four upper-division lecture/seminar electives', () => {
    expect(find(run(harness, { terms: swap('MUSC 150Z', null) }), 'lecture').status).toBe('unmet')
  })

  it('MUSC 105X and MUSC 254A cannot both count', () => {
    const t = swap('MUSC 123C', 'MUSC 105X').map((q) => (q.term === '2280' ? { ...q, courses: ['MUSC 254A', 'MUSC 167'] } : q))
    expect(find(run(harness, { terms: t }), 'lecture').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MUSC 123C', 'MUSC 105X') }), 'lecture').status).toBe('met')
  })

  it('workshops repeat, except MUSC 167R', () => {
    const rep167 = swap('MUSC 167R', 'MUSC 167')
    expect(find(run(harness, { terms: rep167 }), 'workshop').status).toBe('met')
    const rep167R = swap('MUSC 167', 'MUSC 167R')
    expect(find(run(harness, { terms: rep167R }), 'workshop').status).toBe('unmet')
  })

  it('upper-division courses need a letter grade; lower-division may be P/NP', () => {
    expect(find(run(harness, { terms, grades: { 'MUSC 123A': 'P' } }), 'lecture').status).toBe('unmet')
    // MUSC 167 is an upper-division workshop: no ensemble exception in the minor.
    expect(find(run(harness, { terms, grades: { 'MUSC 167': 'P' } }), 'workshop').status).toBe('unmet')
    // MUSC 73 is lower-division (catalog), so P is fine.
    expect(failing(run(harness, { terms, grades: { 'MUSC 73': 'P', 'MUSC 80C': 'P', 'MUSC 11B': 'P' } }))).toEqual([])
  })

  it('a P in an upper-division technical-sound course does not count', () => {
    const t = swap('MUSC 80L', 'FILM 171A')
    expect(find(run(harness, { terms: t }), 'tech-sound').status).toBe('met')
    expect(find(run(harness, { terms: t, grades: { 'FILM 171A': 'P' } }), 'tech-sound').status).toBe('unmet')
  })

  it('PHYS 80U counts under either cross-listed code', () => {
    expect(find(run(harness, { terms: swap('MUSC 80L', 'MUSC 80U') }), 'tech-sound').status).toBe('met')
    expect(find(run(harness, { terms: swap('MUSC 80L', 'PHYS 80U') }), 'tech-sound').status).toBe('met')
  })

  it('a history course outside MUSC 11A–E does not count', () => {
    expect(find(run(harness, { terms: swap('MUSC 11B', 'MUSC 80L') }), 'history-elective').status).toBe('unmet')
  })
})

// Adversarial review (2026-10-06).
describe('electronic-music-minor 2026-27 — review', () => {
  it('MUSC 80U (the lower-division PHYS 80U) may be taken P/NP', () => {
    // "Lower-division courses can be taken for a letter grade or Pass/No Pass."
    const t = swap('MUSC 80L', 'MUSC 80U')
    expect(find(run(harness, { terms: t, grades: { 'MUSC 80U': 'P' } }), 'tech-sound').status).toBe('met')
  })

  it('empty plan: every requirement unmet, test-outs asked', () => {
    const r = run(harness, { terms: [], attested: [] })
    expect(verdict(r).complete).toBe(false)
    expect(find(r, 'attest:theory-placement').status).toBe('needs-attestation')
    expect(find(r, 'lecture').status).toBe('unmet')
  })

  it('MUSC 105X and 254A plus two more is only three electives', () => {
    const t = plan(['2268', 'MUSC 105X', 'MUSC 254A', 'MUSC 123A', 'MUSC 123B'])
    expect(find(run(harness, { terms: t }), 'lecture').progress?.have).toBe(3)
  })

  it('three quarters of MUSC 73 taken P fill the workshop requirement', () => {
    const t = plan(['2268', 'MUSC 73'], ['2270', 'MUSC 73'], ['2272', 'MUSC 73'])
    expect(find(run(harness, { terms: t, grades: { 'MUSC 73': 'P' } }), 'workshop').status).toBe('met')
  })

  it('an upper-division programming course taken P/NP does not count; CSE 20 P does', () => {
    const t = swap('CSE 20', 'ECE 101')
    expect(find(run(harness, { terms: t, grades: { 'ECE 101': 'P' }, attested: [] }), 'programming/course').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'CSE 20': 'P' }, attested: [] }), 'programming').status).toBe('met')
  })

  it('planned courses show in progress, not met', () => {
    const r = run(harness, { terms, currentTerm: '2280', attested: [] })
    expect(find(r, 'lecture').status).toBe('in-progress')
    expect(verdict(r).complete).toBe(false)
  })

  it('a course used as a technical sound elective is not also an upper-division elective', () => {
    // FILM 171A is only on the technical list; MUSC 80L removed: FILM 171A fills tech, lecture still needs four.
    const t = swap('MUSC 80L', 'FILM 171A')
    const r = run(harness, { terms: t })
    expect(find(r, 'tech-sound').status).toBe('met')
    expect(find(r, 'lecture').status).toBe('met')
  })

  it('transfer (no-term) credit for MUSC 14 counts', () => {
    const r = run(harness, { terms: swap('MUSC 14', null), completed: ['MUSC 14'], attested: [] })
    expect(find(r, 'theory').status).toBe('met')
  })

  it('kitchen sink plan is complete', () => {
    const t = plan(
      ['2268', 'MUSC 80C', 'MUSC 11A', 'MUSC 11B', 'MUSC 14', 'MUSC 30A', 'CSE 20', 'CSE 5J'],
      ['2270', ...['MUSC 71', 'MUSC 72', 'PHYS 80U', 'FILM 171A', 'THEA 114']],
      ['2272', ...['MUSC 105H', 'MUSC 123A', 'MUSC 123B', 'MUSC 123C', 'MUSC 150N', 'MUSC 105X', 'MUSC 254A']],
      ['2278', 'MUSC 73', 'MUSC 129', 'MUSC 167', 'MUSC 167R', 'MUSC 267'],
    )
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual([])
  })
})
