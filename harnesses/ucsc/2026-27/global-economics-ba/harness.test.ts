import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'ECON 1', 'AM 11A', 'SPAN 4'],
  ['2270', 'ECON 2', 'AM 11B', 'SPAN 5'],
  ['2272', 'STAT 17', 'STAT 17L', 'SPAN 6'],
  ['2278', 'ECON 100A', 'ECON 113'],
  ['2280', 'ECON 100B', 'ECON 197'],
  ['2282', 'ECON 120', 'ECON 140', 'ECON 141'],
  ['2288', 'ECON 150'],
)
type Terms = typeof base
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const swap = (from: string, to: string) => swapIn(base, from, to)
const drop = (code: string) => base.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('global-economics-ba 2026-27', () => {
  it('complete record: only the area-study declaration is left to the student', () => {
    const r = run(harness, { terms: [...base, { term: '2290', courses: ['HIS 150A', 'LALS 100'] }] })
    expect(failing(r)).toEqual(['area-study-1:cannot-check', 'area-study-2:cannot-check'])
  })

  it('review: declared area-study courses complete the record (with advisor pre-approval)', () => {
    const t = [...base, { term: '2290', courses: ['HIS 150A', 'LALS 100'] }]
    const choices = { area1: 'HIS 150A', area2: 'LALS 100' }
    expect(failing(run(harness, { terms: t, choices }))).toEqual([])
    expect(find(run(harness, { terms: t, choices, attested: ['study abroad'] }), 'attest:area-plan').status).toBe('needs-attestation')
  })

  it('review: area-study declarations must be non-ECON, distinct, in the plan and not used elsewhere', () => {
    const t = [...base, { term: '2290', courses: ['HIS 150A'] }]
    const r = run(harness, { terms: t, choices: { area1: 'ECON 150', area2: 'HIS 150A' } })
    expect(find(r, 'area-study-1').status).toBe('unmet')
    expect(find(r, 'area-study-2').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: { area1: 'HIS 150A', area2: 'HIS 150A' } }), 'area-study-2').status).toBe('unmet')
    expect(find(run(harness, { terms: t, choices: { area1: 'HIS 150A', area2: 'LALS 100' } }), 'area-study-2').status).toBe('unmet')
    // STAT 17 is already the statistics requirement
    expect(find(run(harness, { terms: t, choices: { area1: 'HIS 150A', area2: 'STAT 17' } }), 'area-study-2').status).toBe('unmet')
  })

  it('review: no non-economics candidates and nothing declared -> unmet, not cannot-check', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => !/^(SPAN)/.test(c)) }))
    // AM/STAT are used by other requirements; nothing else outside ECON
    expect(find(run(harness, { terms: t }), 'area-study-1').status).toBe('unmet')
  })

  it('study abroad must be confirmed', () => {
    const r = run(harness, { terms: base, attested: [] })
    expect(find(r, 'attest:study-abroad').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: base, attested: ['study abroad'] }), 'attest:study-abroad').status).toBe('met')
  })

  it('language: level 6 course counts; without it the app cannot tell (equivalents count)', () => {
    expect(find(run(harness, { terms: swap('SPAN 6', 'FREN 6') }), 'language').status).toBe('met')
    // §1a: an equivalent (placement / prior study) is an attestation, asked only without a level-6 course
    expect(find(run(harness, { terms: drop('SPAN 6'), attested: [] }), 'language').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: drop('SPAN 6'), attested: ['language-equivalent'] }), 'language').status).toBe('met')
  })

  it('three electives must come from the global list', () => {
    const n = find(run(harness, { terms: swap('ECON 141', 'ECON 130') }), 'electives')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/global economics list: 2 of 3/)
  })

  it('the fourth elective may be any 5-credit ECON 100-189 or CRWN 152', () => {
    expect(find(run(harness, { terms: swap('ECON 150', 'CRWN 152') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('ECON 150', 'ECON 190') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 150', 'ECON 193') }), 'electives').status).toBe('unmet')
  })

  it('ECON 195/199 may be the fourth elective', () => {
    expect(find(run(harness, { terms: swap('ECON 150', 'ECON 199') }), 'electives').status).toBe('met')
  })

  it('ECON 195 standing in for a list course is not called unmet', () => {
    expect(find(run(harness, { terms: swap('ECON 141', 'ECON 195') }), 'electives').status).toBe('cannot-check')
  })

  it('a DC course is not also an elective (one requirement per course)', () => {
    // ECON 104 is the only DC course: it cannot also be the fourth elective
    const t = swapIn(drop('ECON 150'), 'ECON 197', 'ECON 104')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('MATH 11A path needs the petition', () => {
    const r = run(harness, { terms: swap('AM 11A', 'MATH 11A'), attested: ['study abroad'] })
    expect(find(r, 'math-petition-path').status).toBe('needs-attestation')
  })

  it('comprehensive: C/P or better', () => {
    const r = run(harness, { terms: base, grades: { 'ECON 100A': 'D' } })
    expect(find(r, 'comp-micro').status).toBe('unmet')
    expect(find(r, 'micro').status).toBe('met')
  })

  it('ECON 104 may be the fourth elective when ECON 197 is the DC course (any ECON 100-189)', () => {
    const t = swap('ECON 150', 'ECON 104')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('review: cross-listed LGST 160A is the fourth elective', () => {
    expect(find(run(harness, { terms: swap('ECON 150', 'LGST 160A') }), 'electives').status).toBe('met')
  })

  it('review: ECON 100M next to ECON 100A is not the fourth elective (no credit for both)', () => {
    expect(find(run(harness, { terms: swap('ECON 150', 'ECON 100M') }), 'electives').status).toBe('unmet')
  })

  it('review: ECON 195 and ECON 199 together fill at most one elective', () => {
    expect(find(run(harness, { terms: swapIn(swap('ECON 150', 'ECON 199'), 'ECON 141', 'ECON 195') }), 'electives').status).toBe('unmet')
  })

  it('review: empty plan is unmet', () => {
    expect(run(harness, { terms: [], attested: [] }).status).toBe('unmet')
  })
})
