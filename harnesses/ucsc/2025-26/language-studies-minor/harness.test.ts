import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'LING 50', 'SPAN 4'],
  ['2270', 'SPAN 5'],
  ['2272', 'SPAN 6'],
  ['2278', 'LING 100', 'LING 101'],
  ['2280', 'SPAN 114', 'LING 112'],
  ['2282', 'LING 113'],
)
const S = { concentration: 'Spanish' }
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('language-studies-minor 2025-26', () => {
  it('complete Spanish record is met', () => {
    expect(failing(run(harness, { terms, choices: S }))).toEqual([])
  })

  it('infers the language when the plan has only one', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('asks for the language when ambiguous', () => {
    const t = [...terms, { term: '2288', courses: ['FREN 1'] }]
    expect(run(harness, { terms: t }).nodes.map((n) => n.id)).toEqual(['choice:concentration'])
  })

  it('Level 6 missing: needs the course or an equivalent (attestation)', () => {
    const t = swap(terms, 'SPAN 6', null)
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'level6').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices: S, attested: ['tested out of level 6'] }), 'level6').status).toBe('met')
  })

  it('SPHS 6 satisfies Level 6 for Spanish', () => {
    expect(failing(run(harness, { terms: swap(terms, 'SPAN 6', 'SPHS 6'), choices: S, attested: [] }))).toEqual([])
  })

  it('the advanced course must be in the language of concentration', () => {
    const t = swap(terms, 'SPAN 114', 'FREN 120')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['advanced:unmet'])
  })

  it('LING 111 and LING 112 cannot both count', () => {
    // LING 100, 111, 112, 113: the second syntax course is excluded from the electives
    const t = swap(terms, 'LING 101', 'LING 111')
    expect(find(run(harness, { terms: t, choices: S }), 'electives').status).toBe('unmet')
  })

  it('2025-26: LING 100 is required (not one of "two of the following")', () => {
    // "Take the following course:" LING 100
    const t = swap(terms, 'LING 100', 'LING 171')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['ling100:unmet'])
  })

  it('2025-26: the second required course is LING 111 or LING 112 (LING 101/171 do not qualify)', () => {
    // "Plus one of the following courses:" LING 111, LING 112
    const t = swap(terms, 'LING 112', 'LING 171')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['syntax:unmet'])
  })

  it('2025-26: LING 100 is not an upper-division elective', () => {
    // "LING 101-189 (excluding LING 111 and LING 112)"
    const t = [...swap(terms, 'LING 113', null), { term: '2284', courses: ['LING 100'] }]
    expect(find(run(harness, { terms: t, choices: S }), 'electives').status).toBe('unmet')
  })

  it('2025-26: French advanced language is FREN 100-199', () => {
    // "French: FREN 100-199 or from the LIT 182 series"
    const fr = plan(['2268', 'LING 50', 'FREN 4'], ['2270', 'FREN 5'], ['2272', 'FREN 6'], ['2278', 'LING 100', 'LING 101'], ['2280', 'FREN 115', 'LING 112'], ['2282', 'LING 113'])
    expect(failing(run(harness, { terms: fr, choices: { concentration: 'French' } }))).toEqual([])
  })

  it('2025-26: German is a language of concentration (Level 6 by equivalent only)', () => {
    // "German: GERM 100-199 or from the LIT 183 series"
    const de = plan(['2268', 'LING 50'], ['2278', 'LING 100', 'LING 101'], ['2280', 'LIT 183A', 'LING 112'], ['2282', 'LING 113'])
    const C = { concentration: 'German' }
    expect(find(run(harness, { terms: de, choices: C, attested: [] }), 'level6').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: de, choices: C, attested: ['level6-equivalent'] }))).toEqual([])
  })

  it('a LIT 188/189 course counts as advanced only after Level 6', () => {
    // LIT 189F after SPAN 6 → advanced
    const after = swap(terms, 'SPAN 114', 'LIT 189F')
    expect(failing(run(harness, { terms: after, choices: S }))).toEqual([])
    // LIT 189F in the same term as SPAN 6 → not advanced
    const same = swap(after, 'LIT 189F', null).map((q) => (q.term === '2272' ? { ...q, courses: [...q.courses, 'LIT 189F'] } : q))
    expect(find(run(harness, { terms: same, choices: S }), 'advanced').status).toBe('unmet')
  })

  it('a LIT course before Level 6 can still be an elective', () => {
    const t = plan(['2268', 'LING 50', 'LIT 189F', 'SPAN 5'], ['2270', 'SPAN 6', 'LING 100', 'LING 112'], ['2272', 'SPAN 114', 'LING 113'])
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual([])
  })

  it('an extra advanced Spanish course is an elective', () => {
    expect(failing(run(harness, { terms: swap(terms, 'LING 113', 'SPAN 141'), choices: S }))).toEqual([])
  })

  it('a possible cultural context course makes the electives cannot-check', () => {
    const t = swap(terms, 'LING 113', 'HIS 155')
    expect(find(run(harness, { terms: t, choices: S }), 'electives').status).toBe('cannot-check')
    // with no candidate at all it is unmet
    expect(find(run(harness, { terms: swap(terms, 'LING 113', null), choices: S }), 'electives').status).toBe('unmet')
    // a lower-division course is not a candidate
    expect(find(run(harness, { terms: swap(terms, 'LING 113', 'HIS 11A'), choices: S }), 'electives').status).toBe('unmet')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms, choices: S, grades: { 'SPAN 114': 'P', 'LING 50': 'P' } }))).toEqual([])
  })
})

describe('language-studies-minor 2025-26 review', () => {
  it('one quarter of LING 199 counts as an elective, a second does not', () => {
    // "These courses include independent study (LING 199), …" / "Students may apply no more than one quarter of LING 199."
    expect(find(run(harness, { terms: swap(terms, 'LING 113', 'LING 199'), choices: S }), 'electives').status).toBe('met')
    const two = swap(swap(terms, 'LING 113', 'LING 199'), 'LING 101', 'LING 199')
    expect(find(run(harness, { terms: two, choices: S }), 'electives').status).toBe('unmet')
  })

  it('a declared cultural context course counts', () => {
    const t = swap(terms, 'LING 113', 'HIS 155')
    expect(find(run(harness, { terms: t, choices: { ...S, cultural_context_courses: 'HIS 155' } }), 'electives').status).toBe('met')
  })

  it('Level 6 placement is asked only when no Level 6 course is in the plan', () => {
    const r = run(harness, { terms, choices: S, attested: [] })
    expect(find(r, 'level6').status).toBe('met')
    expect(() => find(r, 'attest:level6-equivalent')).toThrow()
  })
})
