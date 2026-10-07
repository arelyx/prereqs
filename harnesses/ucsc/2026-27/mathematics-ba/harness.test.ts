import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'MATH 21'],
  ['2270', 'MATH 19B', 'MATH 23A'],
  ['2272', 'MATH 23B', 'MATH 24'],
  ['2278', 'MATH 100', 'MATH 105A'],
  ['2280', 'MATH 111A', 'MATH 124'],
  ['2282', 'MATH 115', 'MATH 134'],
  ['2288', 'STAT 131', 'MATH 194'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))
const add = (...extra: string[]) => [...base, { term: '2290', courses: extra }]

describe('mathematics-ba 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('AM 30 + AM 100 is the alternative to MATH 23A + 23B', () => {
    const r = run(harness, { terms: swap('MATH 23A', 'AM 30').map((t) => ({ ...t, courses: t.courses.map((c) => (c === 'MATH 23B' ? 'AM 100' : c)) })) })
    expect(find(r, 'multivar').status).toBe('met')
    // AM 30 alone does not complete the option
    expect(find(run(harness, { terms: swap('MATH 23B') }), 'multivar').status).toBe('unmet')
  })

  it('missing the geometry requirement fails', () => {
    expect(find(run(harness, { terms: swap('MATH 124') }), 'geometry').status).toBe('unmet')
  })

  it('a second analysis course counts as an elective', () => {
    const r = run(harness, { terms: swap('MATH 115', 'MATH 103A') })
    expect(failing(r)).toEqual([])
  })

  it('at most two electives from other departments', () => {
    // MATH 115 and MATH 134 replaced by AM 114 and STAT 132 → three other-department electives
    const r = run(harness, { terms: swap('MATH 115', 'AM 114').map((t) => ({ ...t, courses: t.courses.map((c) => (c === 'MATH 134' ? 'STAT 132' : c)) })) })
    expect(find(r, 'electives').status).toBe('unmet')
    // two from other departments is fine
    expect(find(run(harness, { terms: swap('MATH 115', 'AM 114') }), 'electives').status).toBe('met')
  })

  it('electives must be MATH 101–190: MATH 100-level below 101 and 2-credit courses do not count', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 103B') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 199') }), 'electives').status).toBe('unmet')
  })

  it('a MATH course not on the recommended list but in 101–190 counts', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 128B') }), 'electives').status).toBe('met')
  })

  it('a lecture whose lab was not taken still counts; the lab is not a separate elective', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 148') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 145', 'MATH 145L').map((t) => ({ ...t, courses: t.courses.filter((c) => c !== 'MATH 115') })) }), 'electives').status).toBe('unmet')
  })

  it('PHYS 107 is AM 107 under its cross-listing', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'PHYS 107') }), 'electives').status).toBe('met')
  })

  it('without MATH 194/195 the senior course, DC and comprehensive all fail', () => {
    const r = run(harness, { terms: swap('MATH 194') })
    expect(find(r, 'senior').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('MATH 195 senior thesis works as the senior course, DC and comprehensive', () => {
    expect(failing(run(harness, { terms: swap('MATH 194', 'MATH 195') }))).toEqual([])
  })

  it('MATH 194 cannot also be an elective', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 195') }), 'electives').status).toBe('unmet')
  })

  it('P grades count (no grading-option restrictions)', () => {
    expect(failing(run(harness, { terms: base, grades: { 'MATH 105A': 'P', 'MATH 100': 'P' } }))).toEqual([])
  })

  it('AM 10 and AM 20 substitute for MATH 21 and MATH 24', () => {
    const t = swap('MATH 21', 'AM 10').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 24' ? 'AM 20' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('an extra course makes no difference', () => {
    expect(failing(run(harness, { terms: add('MATH 117') }))).toEqual([])
  })

  it('MATH 111A and MATH 111T: credit for only one (the second is not an elective)', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 111T') }), 'electives').status).toBe('unmet')
  })

  it('review: MATH 23A + AM 100 mixes the two packages and does not satisfy the multivariable option', () => {
    expect(find(run(harness, { terms: swap('MATH 23B', 'AM 100') }), 'multivar').status).toBe('unmet')
  })

  it('review: a lab alone (MATH 145L) is not an elective', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 145L') }), 'electives').status).toBe('unmet')
  })

  it('review: MATH 111T taken first fills algebra; the later MATH 111A earns no credit', () => {
    const t = [{ term: '2266', courses: ['MATH 111T'] }, ...base]
    const r = run(harness, { terms: t })
    expect(find(r, 'algebra').used?.map((e) => e.code)).toEqual(['MATH111T'])
    expect(find(run(harness, { terms: [{ term: '2266', courses: ['MATH 111T'] }, ...swap('MATH 134')] }), 'electives').status).toBe('unmet')
  })

  it('review: NP in MATH 100 blames MATH 100 and the DC requirement', () => {
    const r = run(harness, { terms: base, grades: { 'MATH 100': 'NP' } })
    expect(failing(r)).toEqual(['math100:unmet', 'dc-math100:unmet'])
  })

  it('review: exam/transfer credit with no term counts', () => {
    const r = run(harness, { terms: base.slice(3), completed: ['MATH 19A', 'MATH 21', 'MATH 19B', 'MATH 23A', 'MATH 23B', 'MATH 24'], entry: 'transfer' })
    expect(failing(r)).toEqual([])
  })
})
