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

describe('mathematics-theory-and-computation-bs 2025-26', () => {
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

  it('CSE course for the coding requirement also needs the petition (blamed on the upper-division group, not electives)', () => {
    const r = run(harness, { terms: swap('MATH 152', 'CSE 130'), attested: [] })
    expect(find(r, 'coding').status).toBe('met')
    expect(find(r, 'upper').status).toBe('needs-attestation')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('review: CSE courses in both coding and electives ask the petition in both places', () => {
    const t = swap('MATH 152', 'CSE 130').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 106' ? 'CSE 101' : c)) }))
    const r = run(harness, { terms: t, attested: [] })
    expect(failing(r)).toEqual(['attest:cse-petition:needs-attestation', 'attest:cse-petition:electives:needs-attestation'])
    expect(failing(run(harness, { terms: t, attested: ['cse-petition'] }))).toEqual([])
  })

  it('review: with no listed coding course, a lower-division coding course asks for the substitution the page offers', () => {
    // "Students who have taken a lower-division coding course can request a substitution for the coding requirement."
    const t = swap('MATH 152', 'CSE 20')
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['attest:coding-substitution:needs-attestation'])
    expect(failing(run(harness, { terms: t, attested: ['coding-substitution'] }))).toEqual([])
    // no coding course of any kind: plainly unmet
    expect(failing(run(harness, { terms: swap('MATH 152') }))).toEqual(['coding:unmet'])
  })

  it('review: cross-listed codes PHYS 107 / OCEA 172 / CSE 166A count as the listed electives without a petition', () => {
    const t = swap('MATH 106', 'PHYS 107').map((x) => ({ ...x, courses: x.courses.flatMap((c) => (c === 'STAT 131' ? ['OCEA 172'] : c === 'MATH 124' ? ['CSE 166A'] : [c])) }))
    const r = run(harness, { terms: t, attested: [] })
    expect(failing(r)).toEqual([])
  })

  it('review: a second ALGEBRA THEORY course is not an elective; computation extras are', () => {
    expect(find(run(harness, { terms: swap('MATH 106', 'MATH 111A') }), 'electives').status).toBe('unmet')
    const t = base.map((x) => ({ ...x, courses: x.courses.flatMap((c) => (c === 'MATH 106' ? ['MATH 145'] : c === 'STAT 131' ? ['AM 114'] : c === 'MATH 124' ? ['MATH 116'] : [c])) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
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

  it('2025-26: MATH 114 and MATH 139 are not electives in this edition', () => {
    expect(find(run(harness, { terms: swap('MATH 106', 'MATH 114') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 106', 'MATH 139') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 106', 'MATH 118') }), 'electives').status).toBe('met')
  })

  it('2025-26: ASTR 171 is the cross-listed PHYS 171 elective', () => {
    expect(find(run(harness, { terms: swap('MATH 106', 'ASTR 171') }), 'electives').status).toBe('met')
  })
})
