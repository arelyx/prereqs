import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// ENVS electives 149 (social), 160, 162+162L; EART electives 116, 140+140L, 110A;
// UD EART 110B+110M; comprehensive + DC ENVS 190.
const base = plan(
  ['2228', 'STAT 7', 'STAT 7L', 'MATH 11A', 'CHEM 3A'],
  ['2230', 'MATH 11B', 'ENVS 25', 'EART 5', 'EART 5L'],
  ['2232', 'CHEM 3C', 'ENVS 24', 'PHIL 28'],
  ['2238', 'PHYS 5A', 'PHYS 5L', 'ENVS 100', 'ENVS 100L'],
  ['2240', 'PHYS 5B', 'PHYS 5M', 'EART 110B', 'EART 110M'],
  ['2242', 'ENVS 149', 'ENVS 160', 'EART 116'],
  ['2248', 'ENVS 162', 'ENVS 162L', 'EART 140', 'EART 140L'],
  ['2250', 'EART 110A', 'ENVS 190'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('environmental-studiesearth-sciences-combined-major-ba 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })
  it('chemistry series as printed: CHEM 3A + 3C, or CHEM 4A + 4AL + 4B', () => {
    expect(failing(run(harness, { terms: swap('CHEM 3C') }))).toEqual(['chem:unmet'])
    expect(failing(run(harness, { terms: swap('CHEM 3A', 'CHEM 4A', 'CHEM 4AL', 'CHEM 4B').map((t) => ({ ...t, courses: t.courses.filter((c) => c !== 'CHEM 3C') })) }))).toEqual([])
  })
  it('physics series may not mix PHYS 5 and PHYS 6', () => {
    expect(failing(run(harness, { terms: swap('PHYS 5B', 'PHYS 6B') }))).toEqual(['physics:unmet'])
  })
  it('one EART 110 option: 110B without 110M is not the option (but may be an elective)', () => {
    // 110A then fills the UD option; 110B alone is still an EART elective
    // (labs are not required for electives on this page).
    const r = run(harness, { terms: swap('EART 110M') })
    expect(failing(r)).toEqual([])
    expect(find(r, 'eart110').used?.map((e) => e.display)).toEqual(['EART 110A'])
  })
  it('ENVS electives need one social science course (cross-listed code works)', () => {
    expect(find(run(harness, { terms: swap('ENVS 149', 'ENVS 120') }), 'envs-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ENVS 149', 'LGST 149') }), 'envs-electives').status).toBe('met')
  })
  it('ENVS lecture/lab counts as a single elective; internships do not count', () => {
    expect(find(run(harness, { terms: swap('ENVS 160', 'ENVS 108L') }), 'envs-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ENVS 160', 'ENVS 183') }), 'envs-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ENVS 160', 'ENVS 199') }), 'envs-electives').status).toBe('unmet')
  })
  it('EART electives: 100–191C; a lab alone and EART 191D do not count', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'EART 109L') }), 'eart-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 191D') }), 'eart-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 116', 'EART 191C') }), 'eart-electives').status).toBe('met')
    // lecture without its lab still counts here (labs are not required)
    expect(find(run(harness, { terms: swap('EART 140L') }), 'eart-electives').status).toBe('met')
  })
  it('DC needs ENVS 100/100L plus one option; EART 189A+189B works', () => {
    const r = run(harness, { terms: swap('ENVS 190', 'EART 189A', 'EART 189B') })
    expect(failing(r)).toEqual([])
    expect(find(run(harness, { terms: swap('ENVS 190', 'ENVS 195A', 'ENVS 195B') }), 'dc').status).toBe('met')
    expect(find(run(harness, { terms: swap('ENVS 190', 'ENVS 183A') }), 'dc').status).toBe('unmet')
  })
  it('comprehensive: Earth Sciences B.S. option EART 191 counts but not also as an EART elective', () => {
    // EART 191 alone: DC unmet (not a DC option), comprehensive met.
    const r = run(harness, { terms: swap('ENVS 190', 'EART 191') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'eart-electives').status).toBe('met')
    const t3 = swap('ENVS 190', 'EART 191', 'EART 195').map((t) => ({ ...t, courses: t.courses.filter((c) => c !== 'EART 116') }))
    // EART 191 + EART 195 without EART 116: 195 is the comprehensive (and DC),
    // 191 the third EART elective.
    expect(failing(run(harness, { terms: t3 }))).toEqual([])
    // EART 191 alone cannot be both the comprehensive and an elective.
    const t4 = swap('ENVS 190', 'EART 191', 'ENVS 196').map((t) => ({ ...t, courses: t.courses.filter((c) => c !== 'EART 116' && c !== 'ENVS 196') }))
    const r4 = run(harness, { terms: [...t4, { term: '2252', courses: ['ENVS 183B'] }] })
    expect(failing(r4)).toHaveLength(1)
    expect(find(r4, 'comprehensive').status === 'unmet' || find(r4, 'eart-electives').status === 'unmet').toBe(true)
  })
  it('comprehensive packages need both halves; letter grade required', () => {
    expect(find(run(harness, { terms: swap('ENVS 190', 'ENVS 195B') }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'ENVS 190': 'P' } }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'ENVS 190': 'P' } }), 'dc').status).toBe('met')
  })
  it('no program letter-grade rule outside the comprehensive', () => {
    expect(failing(run(harness, { terms: base, grades: { 'ENVS 149': 'P', 'STAT 7': 'P', 'EART 116': 'P' } }))).toEqual([])
  })
  it('review: cross-listed partners count with no alias map (PHIL 80G, POLI 179 = ENVS 144)', () => {
    expect(failing(run(harness, { terms: swap('PHIL 28', 'PHIL 80G') }))).toEqual([])
    // ENVS 144 [/POLI 179] is ENVS 101–179 but not on the social science list
    expect(find(run(harness, { terms: swap('ENVS 160', 'POLI 179') }), 'envs-electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('ENVS 149', 'POLI 179') }), 'envs-electives').status).toBe('unmet')
  })
  it('review: a graduate seminar is a comprehensive option only by instructor invitation', () => {
    // "Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor."
    const t = swap('ENVS 190', 'ENVS 290')
    expect(find(run(harness, { terms: t, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['graduate seminar'] }), 'comprehensive').status).toBe('met')
    // not asked when a listed option is present
    expect(find(run(harness, { terms: [...base, { term: '2252', courses: ['ENVS 290'] }], attested: [] }), 'comprehensive').status).toBe('met')
    // independent study is not a seminar
    expect(find(run(harness, { terms: swap('ENVS 190', 'ENVS 297A') }), 'comprehensive').status).toBe('unmet')
  })
  it('review: EART 110A used for the UD option is not also an EART elective', () => {
    expect(failing(run(harness, { terms: swap('EART 110B') }))).toEqual(['eart-electives:unmet'])
  })
  it('review: EART 199 is outside EART 100–191C', () => {
    expect(find(run(harness, { terms: swap('EART 116', 'EART 199') }), 'eart-electives').status).toBe('unmet')
  })
})
