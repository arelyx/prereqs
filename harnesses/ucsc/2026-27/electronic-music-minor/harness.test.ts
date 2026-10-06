import { describe, expect, it } from 'vitest'
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
