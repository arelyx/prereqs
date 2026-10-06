import { describe, expect, it } from 'vitest'
import { failing, find, ids, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'MATH 21'],
  ['2270', 'MATH 19B', 'MATH 23A'],
  ['2272', 'MATH 23B', 'MATH 24'],
  ['2278', 'MATH 100', 'MATH 152'],
  ['2280', 'MATH 105A', 'MATH 110'],
  ['2282', 'MATH 148', 'MATH 115'],
  ['2288', 'MATH 106', 'STAT 131', 'MATH 124'],
  ['2290', 'MATH 194'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('mathematics-theory-and-computation-bs 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('coding requirement: MATH 152 or the listed alternatives', () => {
    expect(find(run(harness, { terms: swap('MATH 152') }), 'coding').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 152', 'PHYS 115') }), 'coding').status).toBe('met')
  })

  it('an extra computation-list course counts as an elective', () => {
    expect(failing(run(harness, { terms: swap('MATH 106', 'MATH 134') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('MATH 106', 'AM 147') }))).toEqual([])
  })

  it('an extra THEORY-list course does not count as an elective', () => {
    expect(find(run(harness, { terms: swap('MATH 106', 'MATH 103A') }), 'electives').status).toBe('unmet')
  })

  it('a MATH 101–190 course not on the list is not an elective here', () => {
    expect(find(run(harness, { terms: swap('MATH 106', 'MATH 101') }), 'electives').status).toBe('unmet')
  })

  it('non-math listed electives count (ECON 113, PHYS 116C, CSE 166A cross-listing)', () => {
    const t = swap('MATH 106', 'ECON 113').map((x) => ({ ...x, courses: x.courses.flatMap((c) => (c === 'STAT 131' ? ['PHYS 116C'] : c === 'MATH 124' ? ['CSE 166A'] : [c])) }))
    const r = run(harness, { terms: t, attested: [] })
    expect(failing(r)).toEqual([])
    expect(ids(r)).not.toContain('attest:cse-petition')
  })

  it('each of the four upper-division lists is required', () => {
    expect(find(run(harness, { terms: swap('MATH 148') }), 'analysis-comp').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 115') }), 'algebra-comp').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 110') }), 'algebra-theory').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 105A') }), 'analysis-theory').status).toBe('unmet')
  })

  it('CSE courses for an elective need the CS double-major petition', () => {
    const t = swap('MATH 106', 'CSE 101')
    const pet = run(harness, { terms: t })
    expect(find(pet, 'electives').status).toBe('met')
    expect(find(pet, 'attest:cse-petition').status).toBe('met')
    const noPet = run(harness, { terms: t, attested: [] })
    expect(find(noPet, 'electives').status).toBe('needs-attestation')
  })

  it('a CSE course is not used (and no petition asked) when listed courses suffice', () => {
    const r = run(harness, { terms: [...base, { term: '2292', courses: ['CSE 101', 'CSE 102'] }], attested: [] })
    expect(failing(r)).toEqual([])
    expect(ids(r)).not.toContain('attest:cse-petition')
  })

  it('CSE course for the coding requirement also needs the petition', () => {
    const r = run(harness, { terms: swap('MATH 152', 'CSE 130'), attested: [] })
    expect(find(r, 'coding').status).toBe('met')
    expect(find(r, 'electives').status).toBe('needs-attestation')
  })

  it('comprehensive and DC need MATH 194 or 195', () => {
    const r = run(harness, { terms: swap('MATH 194') })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('MATH 194', 'MATH 195') }))).toEqual([])
  })

  it('AM 10 / AM 20 / AM 30 + AM 100 lower-division alternatives', () => {
    const t = base.map((x) => ({ ...x, courses: x.courses.map((c) => ({ 'MATH 21': 'AM 10', 'MATH 24': 'AM 20', 'MATH 23A': 'AM 30', 'MATH 23B': 'AM 100' } as Record<string, string>)[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
