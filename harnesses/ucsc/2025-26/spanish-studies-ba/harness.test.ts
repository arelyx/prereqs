import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Languages & Linguistics: core in 2280/2282, concentration courses after,
// elective, capstone SPAN 157 last (after all four core courses).
const ll = plan(
  ['2268', 'SPAN 4', 'LING 50'],
  ['2270', 'SPAN 5', 'HIS 11A'],
  ['2272', 'SPAN 6'],
  ['2278', 'SPAN 114', 'LIT 189A'],
  ['2280', 'LIT 189C', 'SPAN 150'],
  ['2282', 'SPAN 140', 'SPAN 141', 'SPAN 151'],
  ['2288', 'APLX 101'],
  ['2290', 'SPAN 157'],
)
const LL = { concentration: 'Languages and Linguistics' }
const LC = { concentration: 'Literature and Culture' }
type T = typeof ll
const swap = (t: T, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const lc = swap(swap(swap(swap(ll, 'SPAN 140', 'LIT 188A'), 'SPAN 141', 'LIT 189F'), 'SPAN 151', 'LIT 189L'), 'SPAN 157', 'LIT 190X')

describe('spanish-studies-ba 2025-26', () => {
  it('asks for the concentration', () => {
    expect(run(harness, { terms: ll }).nodes.map((n) => n.id)).toEqual(['choice:concentration'])
  })

  it('complete Languages and Linguistics record is met', () => {
    expect(failing(run(harness, { terms: ll, choices: LL, attested: [] }))).toEqual([])
  })

  it('complete Literature and Culture record is met', () => {
    expect(failing(run(harness, { terms: lc, choices: LC, attested: [] }))).toEqual([])
  })

  it('wrong concentration list: L&L courses do not count for Literature and Culture', () => {
    expect(find(run(harness, { terms: ll, choices: LC }), 'concentration-courses').status).toBe('unmet')
  })

  it('Literature and Culture: unlisted LIT 188/189 courses and LIT 199 count', () => {
    expect(failing(run(harness, { terms: swap(lc, 'LIT 189L', 'LIT 189E'), choices: LC }))).toEqual([])
    expect(failing(run(harness, { terms: swap(lc, 'LIT 189L', 'LIT 199'), choices: LC }))).toEqual([])
  })

  it('a core course cannot also be a concentration course', () => {
    // LIT 189A is the only literature core; it cannot fill the third concentration slot
    const t = swap(lc, 'LIT 189L', null)
    expect(failing(run(harness, { terms: t, choices: LC }))).toEqual(['concentration-courses:unmet'])
    // with LIT 189B as well, one is core and the other a concentration course
    expect(failing(run(harness, { terms: swap(lc, 'LIT 189L', 'LIT 189B'), choices: LC }))).toEqual([])
  })

  it('capstone is not double-counted as a concentration course', () => {
    const t = swap(ll, 'SPAN 151', null)
    // SPAN 157 (capstone) cannot also be the third concentration course
    expect(failing(run(harness, { terms: t, choices: LL }))).toEqual(['concentration-courses:unmet'])
  })

  it('the elective may come from either concentration list', () => {
    expect(failing(run(harness, { terms: swap(ll, 'APLX 101', 'LIT 188B'), choices: LL }))).toEqual([])
    expect(failing(run(harness, { terms: swap(ll, 'APLX 101', null), choices: LL }))).toEqual(['elective:unmet'])
  })

  it('history course required', () => {
    expect(failing(run(harness, { terms: swap(ll, 'HIS 11A', 'HIS 12'), choices: LL }))).toEqual([])
    expect(failing(run(harness, { terms: swap(ll, 'HIS 11A', null), choices: LL }))).toEqual(['history:unmet'])
  })

  it('Level 4 Spanish must be letter graded; the capstone too', () => {
    expect(failing(run(harness, { terms: ll, choices: LL, grades: { 'SPAN 4': 'P' } }))).toEqual(['level4-letter:unmet'])
    // SPAN 151 is also a capstone course, so both must be P for the capstone to fail
    expect(failing(run(harness, { terms: ll, choices: LL, grades: { 'SPAN 157': 'P' } }))).toEqual([])
    expect(failing(run(harness, { terms: ll, choices: LL, grades: { 'SPAN 157': 'P', 'SPAN 151': 'P' } }))).toEqual(['capstone:unmet'])
    expect(failing(run(harness, { terms: ll, choices: LL, grades: { 'SPAN 141': 'P', 'SPAN 114': 'P' } }))).toEqual([])
  })

  it('heritage track and placed-in levels', () => {
    const t = swap(swap(swap(ll, 'SPAN 4', 'SPHS 4'), 'SPAN 5', 'SPHS 5'), 'SPAN 6', 'SPHS 6')
    expect(failing(run(harness, { terms: t, choices: LL, attested: [] }))).toEqual([])
    expect(find(run(harness, { terms: swap(ll, 'SPAN 6', null), choices: LL }), 'track').status).toBe('unmet')
  })

  it('concentration courses may not precede LIT 189C and SPAN 150', () => {
    const t = ll.map((q) => (q.term === '2278' ? { ...q, courses: [...q.courses, 'SPAN 142'] } : q)).map((q) => (q.term === '2282' ? { ...q, courses: q.courses.filter((c) => c !== 'SPAN 141') } : q))
    expect(failing(run(harness, { terms: t, choices: LL }))).toEqual(['concentration-order:unmet'])
  })

  it('capstone must follow at least three core courses', () => {
    const t = swap(ll, 'SPAN 157', null).map((q) => (q.term === '2278' ? { ...q, courses: [...q.courses, 'SPAN 157'] } : q))
    expect(failing(run(harness, { terms: t, choices: LL }))).toEqual(['capstone-order:unmet'])
  })

  it('another SPAN course for the concentration needs the director’s permission', () => {
    const t = swap(ll, 'SPAN 140', 'SPAN 199')
    expect(find(run(harness, { terms: t, choices: LL, attested: [] }), 'concentration-courses').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, choices: LL, attested: ['director permission'] }))).toEqual([])
  })

  it('DC is SPAN 114 or SPHS 115', () => {
    expect(failing(run(harness, { terms: swap(ll, 'SPAN 114', 'SPHS 115'), choices: LL }))).toEqual([])
  })
})

describe('spanish-studies-ba 2025-26 review', () => {
  it('2025-26: SPAN 130 is not on the Languages and Linguistics list (director permission)', () => {
    const t = swap(ll, 'SPAN 140', 'SPAN 130')
    expect(find(run(harness, { terms: t, choices: LL, attested: [] }), 'concentration-courses').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap(ll, 'SPAN 140', 'LGST 130A'), choices: LL, attested: [] }), 'concentration-courses').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, choices: LL, attested: ['director permission'] }))).toEqual([])
  })

  it('2025-26: LALS 127 and LALS 145 are electives', () => {
    expect(failing(run(harness, { terms: swap(ll, 'APLX 101', 'LALS 127'), choices: LL, attested: [] }))).toEqual([])
    expect(failing(run(harness, { terms: swap(ll, 'APLX 101', 'LALS 145'), choices: LL, attested: [] }))).toEqual([])
  })

  it('cross-listed codes count as the same course (no partner-code workaround)', () => {
    // "LIT 189C [/SPAN 105] — Introducción a Spanish Studies (5)"
    expect(find(run(harness, { terms: swap(ll, 'LIT 189C', 'SPAN 105'), choices: LL, attested: [] }), 'core-spanish-studies').status).toBe('met')
    // "LIT 190X [/SPAN 190A] — Temas de la literatura y cultura espanolas y latinoamericanas (5)"
    expect(failing(run(harness, { terms: swap(lc, 'LIT 190X', 'SPAN 190A'), choices: LC, attested: [] }))).toEqual([])
  })

  it('a capstone taken P/NP is not the capstone; a second LIT 189A cannot be a concentration course', () => {
    const r = run(harness, { terms: swap(ll, 'SPAN 151', null), choices: LL, grades: { 'SPAN 157': 'P' }, attested: [] })
    expect(find(r, 'capstone').status).toBe('unmet')
    const twice = swap(lc, 'LIT 189L', 'LIT 189A')
    expect(find(run(harness, { terms: twice, choices: LC, attested: [] }), 'concentration-courses').status).toBe('unmet')
  })

  it('records with no terms are not blamed for sequencing', () => {
    expect(failing(run(harness, { terms: [], completed: ll.flatMap((q) => q.courses), choices: LL, attested: [] }))).toEqual([])
  })
})
