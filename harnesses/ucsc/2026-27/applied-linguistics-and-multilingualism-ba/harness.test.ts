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

describe('applied-linguistics-and-multilingualism-ba 2026-27', () => {
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

  it('LALS 171 (on the list, in none of the five languages) is cannot-check', () => {
    expect(find(run(harness, { terms: swap(base, 'SPAN 141', 'LALS 171'), choices: S }), 'advanced').status).toBe('cannot-check')
  })

  it('SPAN 130 counts under its cross-listed code LGST 130A', () => {
    // "SPAN 130 [/LGST 130A] — Spanish for the Legal Profession (5)"
    expect(find(run(harness, { terms: swap(base, 'SPAN 141', 'LGST 130A'), choices: S }), 'advanced').status).toBe('met')
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
