import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Science: BIOL 20A, BIOE 20C, PHYS 6A+6L, CHEM 3A, CHEM 3B (fall 2026+).
// EART electives 104, 140+140L, 102; ANTH electives 101, 170, 172, 176A;
// comprehensive ANTH 194H (also DC).
const base = plan(
  ['2268', 'ANTH 1', 'EART 10', 'EART 10L', 'MATH 19A', 'CHEM 3A'],
  ['2270', 'ANTH 2', 'MATH 19B', 'CHEM 3B'],
  ['2272', 'ANTH 3', 'BIOL 20A', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'BIOE 20C', 'EART 110A'],
  ['2280', 'EART 104', 'ANTH 101', 'ANTH 170'],
  ['2282', 'EART 140', 'EART 140L', 'ANTH 172'],
  ['2288', 'EART 102', 'ANTH 176A'],
  ['2290', 'ANTH 194H'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('earth-sciencesanthropology-combined-major-ba 2026-27', () => {
  it('complete record: everything met except the external anthropology list (cannot-check)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual(['anth-electives:cannot-check'])
  })

  it('fewer than four upper-division ANTH electives is unmet', () => {
    expect(find(run(harness, { terms: swap('ANTH 176A') }), 'anth-electives').status).toBe('unmet')
  })

  it('the comprehensive seminar cannot also be an anthropology elective', () => {
    // With one ANTH elective missing, ANTH 194H stays with the comprehensive.
    const r = run(harness, { terms: swap('ANTH 176A') })
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'anth-electives').status).toBe('unmet')
  })

  it('intro geology lecture and lab are interchangeable', () => {
    expect(failing(run(harness, { terms: swap('EART 10L', 'EART 20L') }))).toEqual(['anth-electives:cannot-check'])
  })

  it('a physics lecture counts only with its lab', () => {
    expect(find(run(harness, { terms: swap('PHYS 6L') }), 'science').status).toBe('unmet')
  })

  it('CHEM 3B before fall 2026 needs CHEM 3BL; with it, the pair counts as one', () => {
    const early = [{ term: '2262', courses: ['CHEM 3B'] }, ...swap('CHEM 3B')]
    expect(find(run(harness, { terms: early }), 'science').status).toBe('unmet')
    const withLab = [{ term: '2262', courses: ['CHEM 3B', 'CHEM 3BL'] }, ...swap('CHEM 3B')]
    expect(find(run(harness, { terms: withLab }), 'science').status).toBe('met')
  })

  it('CHEM 3B with no term and no lab: cannot tell', () => {
    const r = run(harness, { terms: swap('CHEM 3B'), completed: ['CHEM 3B'] })
    expect(find(r, 'science').status).toBe('cannot-check')
  })

  it('CHEM 3 and CHEM 4 series may not both count', () => {
    const r = run(harness, { terms: swap('CHEM 3B', 'CHEM 4A', 'CHEM 4AL') })
    expect(find(r, 'science').status).toBe('unmet')
    const four = swap('CHEM 3B', 'CHEM 4B', 'CHEM 4BL').map((t) => ({ ...t, courses: t.courses.map((c) => (c === 'CHEM 3A' ? 'CHEM 4A' : c)) }))
    expect(find(run(harness, { terms: [...four, { term: '2292', courses: ['CHEM 4AL'] }] }), 'science').status).toBe('met')
  })

  it('EART electives: no OCEA, no EART 198, lecture needs its lab', () => {
    expect(find(run(harness, { terms: swap('EART 102', 'OCEA 101') }), 'eart-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 102', 'EART 198') }), 'eart-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 140L') }), 'eart-electives').status).toBe('unmet')
  })

  it('DC: an unlisted ANTH 194 seminar is neither DC nor comprehensive', () => {
    const r = run(harness, { terms: swap('ANTH 194H', 'ANTH 194E') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('EART 189A + 189B: DC and comprehensive, and not also an EART elective', () => {
    const t = [...swap('ANTH 194H'), { term: '2294', courses: ['EART 189A', 'EART 189B'] }]
    expect(failing(run(harness, { terms: t }))).toEqual(['anth-electives:cannot-check'])
    // EART 189B may not stand in for a missing EART elective
    const t2 = t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'EART 102') }))
    expect(find(run(harness, { terms: t2 }), 'eart-electives').status).toBe('unmet')
  })

  it('EART 198 internship comprehensive needs the director’s approval', () => {
    const t = [...swap('ANTH 194H', 'EART 195')]
    expect(find(run(harness, { terms: t }), 'comprehensive').status).toBe('met')
    const intern = [...swap('ANTH 194H', 'EART 198', 'EART 191')]
    // DC via EART 191; comprehensive prefers EART 191 over the internship
    expect(find(run(harness, { terms: intern, attested: [] }), 'comprehensive').status).toBe('met')
    const r2 = run(harness, { terms: swap('ANTH 194H', 'EART 198'), attested: [] })
    expect(find(r2, 'comprehensive').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap('ANTH 194H', 'EART 198'), attested: ['internship'] }), 'comprehensive').status).toBe('met')
  })

  it('P grades are allowed (no letter-grade policy)', () => {
    expect(failing(run(harness, { terms: base, grades: { 'EART 104': 'P', 'BIOL 20A': 'P' } }))).toEqual(['anth-electives:cannot-check'])
  })
  it('EART 110C counts as an EART elective only with EART 110N', () => {
    expect(find(run(harness, { terms: swap('EART 102', 'EART 110C') }), 'eart-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 102', 'EART 110C', 'EART 110N') }), 'eart-electives').status).toBe('met')
  })
  const DECL = { anth_courses: 'ANTH 101, ANTH 170; ANTH 172, ANTH 176A' }
  it('review (§1a): declaring the four listed anthropology courses meets the requirement', () => {
    // "Students should consult the [Anthropology Department’s course list] ..." — the student declares.
    expect(failing(run(harness, { terms: base, choices: DECL }))).toEqual([])
  })
  it('review: a declared list with only three courses in the plan is unmet', () => {
    const r = run(harness, { terms: base, choices: { anth_courses: 'ANTH 101, ANTH 170, ANTH 172' } })
    expect(failing(r)).toEqual(['anth-electives:unmet'])
  })
  it('review: a declared comprehensive seminar is not also an anthropology elective', () => {
    const r = run(harness, { terms: base, choices: { anth_courses: 'ANTH 101, ANTH 170, ANTH 172, ANTH 194H' } })
    expect(find(r, 'comprehensive').used?.map((e) => e.display)).toEqual(['ANTH 194H'])
    expect(find(r, 'anth-electives').status).toBe('unmet')
  })
  it('review: a declared lower-division or 2-credit ANTH course does not count', () => {
    const r = run(harness, { terms: swap('ANTH 176A', 'ANTH 188A'), choices: { anth_courses: 'ANTH 101, ANTH 170, ANTH 172, ANTH 188A' } })
    expect(find(r, 'anth-electives').status).toBe('unmet')
  })
  it('review: EART 199 taken twice is one elective; EART 110A is not also an elective', () => {
    const t = swap('EART 102', 'EART 199').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'EART 104' ? 'EART 199' : c)) }))
    expect(find(run(harness, { terms: t, choices: DECL }), 'eart-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EART 102'), choices: DECL }), 'eart-electives').status).toBe('unmet')
  })
  it('review: EART 191C is DC but not a comprehensive option here', () => {
    const r = run(harness, { terms: swap('ANTH 194H', 'EART 191C'), choices: DECL })
    expect(find(r, 'dc').status).toBe('met')
    expect(failing(r)).toEqual(['comprehensive:unmet'])
  })
  it('review: empty plan', () => {
    const f = failing(run(harness, { terms: [] }))
    for (const id of ['calc:unmet', 'science:unmet', 'eart110a:unmet', 'eart-electives:unmet', 'anth-electives:unmet', 'comprehensive:unmet']) expect(f).toContain(id)
  })
})
