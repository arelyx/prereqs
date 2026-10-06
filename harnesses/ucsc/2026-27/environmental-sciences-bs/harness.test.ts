import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Electives: EART 116, OCEA 120, ESCI 150, EART 146+146L, METX 150; comprehensive ESCI 191 (also DC).
const base = plan(
  ['2268', 'CHEM 3A', 'MATH 11A', 'EART 20', 'EART 20L'],
  ['2270', 'CHEM 3B', 'MATH 11B', 'ENVS 25'],
  ['2272', 'CHEM 3C', 'ESCI 30', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'ESCI 100A'],
  ['2280', 'ESCI 100B', 'ESCI 160', 'EART 116'],
  ['2282', 'OCEA 120', 'ESCI 150'],
  ['2288', 'EART 146', 'EART 146L', 'METX 150'],
  ['2290', 'ESCI 191'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('environmental-sciences-bs 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })
  it('CHEM 3C before fall 2026 needs CHEM 3CL', () => {
    const t = [{ term: '2262', courses: ['CHEM 3C'] }, ...swap('CHEM 3C')]
    expect(failing(run(harness, { terms: t }))).toEqual(['gen-chem:unmet'])
  })
  it('intro geology lecture and lab are interchangeable; lab still required', () => {
    expect(failing(run(harness, { terms: swap('EART 20L', 'EART 5L') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('EART 20L') }))).toEqual(['intro-lab:unmet'])
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
    expect(failing(run(harness, { terms: swap('EART 146L') }))).toEqual(['electives:unmet'])
  })
  it('ESCI numbered above 189, EART 198 and other departments do not count', () => {
    expect(find(run(harness, { terms: swap('METX 150', 'EART 198') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('METX 150', 'BIOE 107') }), 'electives').status).toBe('unmet')
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
