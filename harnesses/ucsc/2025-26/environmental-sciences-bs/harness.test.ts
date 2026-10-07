import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Electives: EART 116, OCEA 120, ESCI 150, EART 146 (+146L), METX 150; comprehensive ESCI 191 (also DC).
const base = plan(
  ['2268', 'CHEM 3A', 'MATH 11A', 'EART 20', 'EART 20L'],
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 11B', 'ENVS 25'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'ESCI 30', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'ESCI 100A'],
  ['2280', 'ESCI 100B', 'ESCI 160', 'EART 116'],
  ['2282', 'OCEA 120', 'ESCI 150'],
  ['2288', 'EART 146', 'EART 146L', 'METX 150'],
  ['2290', 'ESCI 191'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('environmental-sciences-bs 2025-26', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })
  it('2025-26: CHEM 3CL is required with CHEM 3C (taken before fall 2026, or undated)', () => {
    const t = [{ term: '2262', courses: ['CHEM 3C'] }, ...swap('CHEM 3C').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CHEM 3CL') }))]
    expect(failing(run(harness, { terms: t }))).toEqual(['gen-chem:unmet'])
    const u = swap('CHEM 3C').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CHEM 3CL') }))
    expect(failing(run(harness, { terms: u, completed: ['CHEM 3C'] }))).toEqual(['gen-chem:unmet'])
  })
  it('2025-26: CHEM 3B/3C from fall 2026 on without the labs is cannot-check', () => {
    const r = run(harness, { terms: base.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CHEM 3BL' && c !== 'CHEM 3CL') })) })
    expect(failing(r)).toEqual(['gen-chem:cannot-check'])
  })
  it('2025-26: CHEM 1A, 1C and 1N (note) satisfy general chemistry', () => {
    const old = [{ term: '2228', courses: ['CHEM 1A', 'CHEM 1C', 'CHEM 1N'] }, ...base.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('CHEM')) }))]
    expect(failing(run(harness, { terms: old }))).toEqual([])
  })
  it('2025-26: intro geology lecture and lab must be a matching pair; lab required', () => {
    expect(failing(run(harness, { terms: swap('EART 20L', 'EART 5L') }))).toEqual(['intro-geology:unmet'])
    expect(failing(run(harness, { terms: swap('EART 20L') }))).toEqual(['intro-geology:unmet'])
  })
  it('2025-26: EART 146 counts as an elective without EART 146L', () => {
    expect(failing(run(harness, { terms: swap('EART 146L') }))).toEqual([])
  })
  it('ENVS 25 and ESCI 30 are required', () => {
    expect(failing(run(harness, { terms: swap('ESCI 30') }))).toEqual(['ld-core/ESCI30:unmet'])
  })
  it('five electives; ESCI 191 (comprehensive) cannot be one', () => {
    expect(failing(run(harness, { terms: swap('METX 150') }))).toEqual(['electives:unmet'])
  })
  it('METX 150 counts without METX 150L; ECE 180J counts', () => {
    expect(failing(run(harness, { terms: swap('METX 150', 'ECE 180J') }))).toEqual([])
  })
  it('EART lecture with a catalog lab needs the lab', () => {
    // EART 146 + 146L swapped for EART 140 alone (EART 140L exists)
    expect(failing(run(harness, { terms: swap('EART 146', 'EART 140').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'EART 146L') })) }))).toEqual(['electives:unmet'])
  })
  it('ESCI numbered above 189 and EART 198 do not count', () => {
    expect(find(run(harness, { terms: swap('METX 150', 'EART 198') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('METX 150', 'ESCI 190') }), 'electives').status).toBe('unmet')
  })
  it('review (§1a petition path): up to two other-department courses need a faculty advisor’s permission', () => {
    // "Up to two courses from other departments may be considered for upper-division elective credit by permission of a faculty advisor."
    const one = swap('METX 150', 'BIOE 107')
    expect(find(run(harness, { terms: one, attested: [] }), 'electives').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: one, attested: ['faculty advisor'] }), 'electives').status).toBe('met')
    // not asked when the listed electives already suffice
    expect(find(run(harness, { terms: [...base, { term: '2292', courses: ['BIOE 107'] }], attested: [] }), 'electives').status).toBe('met')
    // a third other-department course does not count; nor do lower-division ones
    const three = swap('METX 150', 'BIOE 107').map((t) => ({ ...t, courses: t.courses.map((c) => (c === 'OCEA 120' ? 'BIOE 108' : c === 'ESCI 150' ? 'ECON 170' : c)) }))
    expect(find(run(harness, { terms: three }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('METX 150', 'BIOE 20C') }), 'electives').status).toBe('unmet')
    // ENVS 115A without 115L is not an other-department elective
    expect(find(run(harness, { terms: swap('METX 150', 'ENVS 115A') }), 'electives').status).toBe('unmet')
  })
  it('review: cross-listed OCEA 141 / ESCI 141 counts', () => {
    expect(failing(run(harness, { terms: swap('METX 150', 'OCEA 141') }))).toEqual([])
  })
  it('one quarter of EART 199/OCEA 199 at most', () => {
    expect(failing(run(harness, { terms: swap('METX 150', 'EART 199') }))).toEqual([])
    expect(find(run(harness, { terms: swap('METX 150', 'EART 199', 'OCEA 199').map((t) => ({ ...t, courses: t.courses.filter((c) => c !== 'EART 116') })) }), 'electives').status).toBe('unmet')
  })
  it('ENVS 115A + 115L together as one elective', () => {
    expect(failing(run(harness, { terms: swap('METX 150', 'ENVS 115A', 'ENVS 115L') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('METX 150', 'ENVS 115L') }))).toEqual(['electives:unmet'])
  })
  it('thesis ESCI 195 satisfies DC and comprehensive, P allowed', () => {
    expect(failing(run(harness, { terms: swap('ESCI 191', 'ESCI 195'), grades: { 'ESCI 195': 'P' } }))).toEqual([])
  })
  it('no capstone or thesis: DC and comprehensive unmet', () => {
    const r = run(harness, { terms: swap('ESCI 191') })
    expect(failing(r).sort()).toEqual(['comprehensive:unmet', 'dc:unmet'])
  })
  it('letter grades required elsewhere', () => {
    expect(failing(run(harness, { terms: base, grades: { 'ESCI 191': 'P' } })).sort()).toEqual(['comprehensive:unmet', 'dc:unmet'])
    expect(failing(run(harness, { terms: base, grades: { 'OCEA 120': 'P' } }))).toEqual(['electives:unmet'])
    expect(failing(run(harness, { terms: base, grades: { 'ENVS 25': 'P' } }))).toEqual(['ld-core/ENVS25:unmet'])
  })
  it('EART 110B counts only with its lab EART 110M', () => {
    expect(find(run(harness, { terms: swap('METX 150', 'EART 110B') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('METX 150', 'EART 110B', 'EART 110M') }), 'electives').status).toBe('met')
  })
})
