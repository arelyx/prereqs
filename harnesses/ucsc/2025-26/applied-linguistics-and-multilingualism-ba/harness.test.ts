import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'APLX 80', 'SPAN 5'],
  ['2270', 'LING 50', 'SPAN 6'],
  ['2278', 'APLX 101', 'LING 100'],
  ['2280', 'LING 111', 'SPAN 114', 'APLX 102'],
  ['2282', 'SPAN 141', 'APLX 113', 'APLX 135'],
  ['2288', 'LING 154'],
  ['2290', 'APLX 190'],
)
const S = { language: 'Spanish' }
type T = typeof base
const swap = (t: T, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('applied-linguistics-and-multilingualism-ba 2025-26', () => {
  it('complete Spanish record is met', () => {
    expect(failing(run(harness, { terms: base, choices: S }))).toEqual([])
  })

  it('target language is inferred when unambiguous; accepts concentration as the key', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
    const t = [...base, { term: '2292', courses: ['FREN 1'] }]
    expect(run(harness, { terms: t }).nodes.map((n) => n.id)).toEqual(['choice:language'])
    expect(failing(run(harness, { terms: t, choices: { concentration: 'Spanish' } }))).toEqual([])
  })

  it('Level 6 course is required (no equivalence)', () => {
    expect(failing(run(harness, { terms: swap(base, 'SPAN 6', null), choices: S }))).toEqual(['level6:unmet'])
  })

  it('advanced courses must be in the target language', () => {
    const t = swap(base, 'SPAN 141', 'FREN 120')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['advanced:unmet'])
  })

  it('a course cannot count as both advanced language and elective', () => {
    // SPAN 140 is on both lists; with SPAN 114 + SPAN 140 as advanced, the electives lack one
    const t = swap(swap(base, 'SPAN 141', 'SPAN 140'), 'LING 154', null)
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['electives:unmet'])
  })

  it('at least three APLX electives', () => {
    const t = swap(base, 'APLX 135', 'LING 117')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['electives:unmet'])
  })

  it('an unlisted upper-division Spanish course for advanced: complete list (declared) or petition', () => {
    // "Students may petition to have other 5-credit, upper-division courses offered in the student’s target language count toward the advanced language proficiency requirement."
    const t = swap(base, 'SPAN 141', 'SPAN 199')
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'advanced-group').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices: S, attested: ['advanced language petition'] }), 'advanced-group').status).toBe('met')
    expect(failing(run(harness, { terms: t, choices: { ...S, advanced_list_courses: 'SPAN 199' }, attested: [] }))).toEqual([])
    // a listed course needs no petition
    expect(failing(run(harness, { terms: base, choices: S, attested: [] }))).toEqual([])
  })

  it('LALS 171 (on the list, in none of the six languages) is cannot-check', () => {
    expect(find(run(harness, { terms: swap(base, 'SPAN 141', 'LALS 171'), choices: S }), 'advanced').status).toBe('cannot-check')
  })

  it('2025-26: SPAN 130 is not on the in-page list (complete list or petition)', () => {
    const t = swap(base, 'SPAN 141', 'SPAN 130')
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'advanced-group').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap(base, 'SPAN 141', 'LGST 130A'), choices: S, attested: [] }), 'advanced-group').status).toBe('needs-attestation')
  })

  it('2025-26: FREN 105, FREN 115 and JAPN 111 are not on the in-page list', () => {
    const fr = swap(swap(swap(swap(base, 'SPAN 5', 'FREN 5'), 'SPAN 6', 'FREN 6'), 'SPAN 114', 'FREN 120'), 'SPAN 141', 'FREN 115')
    expect(find(run(harness, { terms: fr, choices: { language: 'French' }, attested: [] }), 'advanced-group').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap(fr, 'FREN 115', 'FREN 105'), choices: { language: 'French' }, attested: [] }), 'advanced-group').status).toBe('needs-attestation')
    const jp = swap(swap(swap(swap(base, 'SPAN 5', 'JAPN 5'), 'SPAN 6', 'JAPN 6'), 'SPAN 114', 'JAPN 103'), 'SPAN 141', 'JAPN 111')
    expect(find(run(harness, { terms: jp, choices: { language: 'Japanese' }, attested: [] }), 'advanced-group').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: swap(jp, 'JAPN 111', 'JAPN 104'), choices: { language: 'Japanese' }, attested: [] }))).toEqual([])
  })

  it('2025-26: Arabic target language — approved Global Engagement coursework; Level 6 cannot-check', () => {
    // "(Arabic, Chinese, French, Italian, Japanese, or Spanish)" / "complete approved upper-division coursework in Arabic through the Division of Global Engagement"
    const ar = swap(swap(swap(swap(base, 'SPAN 5', 'ARBC 3'), 'SPAN 6', 'ARBC 4'), 'SPAN 114', 'ARBC 101'), 'SPAN 141', 'ARBC 102')
    const A = { language: 'Arabic' }
    const r = run(harness, { terms: ar, choices: A, attested: [] })
    expect(find(r, 'advanced-group').status).toBe('needs-attestation')
    expect(find(r, 'level6-arabic').status).toBe('cannot-check')
    const ok = run(harness, { terms: ar, choices: A, attested: ['arabic-global-engagement'] })
    expect(find(ok, 'advanced-group').status).toBe('met')
    // a listed Level 6 course in another language meets Level 6
    expect(failing(run(harness, { terms: swap(ar, 'ARBC 3', 'SPAN 6'), choices: A, attested: ['arabic-global-engagement'] }))).toEqual([])
  })

  it('the Level 6 course need not be in the target language; an NP does not count', () => {
    expect(failing(run(harness, { terms: swap(base, 'SPAN 6', 'FREN 6'), choices: S }))).toEqual([])
    expect(failing(run(harness, { terms: base, choices: S, grades: { 'APLX 113': 'NP' } }))).toEqual(['electives:unmet'])
  })

  it('APLX 190 must be letter graded (DC and comprehensive)', () => {
    const r = run(harness, { terms: base, choices: S, grades: { 'APLX 190': 'P' } })
    expect(find(r, 'aplx190').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('at most two courses P/NP', () => {
    expect(failing(run(harness, { terms: base, choices: S, grades: { 'APLX 102': 'P', 'LING 100': 'P' } }))).toEqual([])
    expect(failing(run(harness, { terms: base, choices: S, grades: { 'APLX 102': 'P', 'LING 100': 'P', 'SPAN 114': 'P' } }))).toEqual(['pnp-limit:unmet'])
  })

  it('LING 112 instead of LING 111', () => {
    expect(failing(run(harness, { terms: swap(base, 'LING 111', 'LING 112'), choices: S }))).toEqual([])
  })

  it('French target language with French list courses', () => {
    const t = swap(swap(swap(swap(base, 'SPAN 5', 'FREN 5'), 'SPAN 6', 'FREN 6'), 'SPAN 114', 'FREN 120'), 'SPAN 141', 'FREN 125A')
    expect(failing(run(harness, { terms: t, choices: { language: 'French' } }))).toEqual([])
  })
})
