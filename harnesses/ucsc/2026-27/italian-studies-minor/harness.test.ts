import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// ITAL 106 (culture, in Italian) + LIT 185Q (literature, in Italian).
const base = plan(
  ['2268', 'ITAL 1'],
  ['2270', 'ITAL 2'],
  ['2272', 'ITAL 3'],
  ['2278', 'ITAL 4'],
  ['2280', 'ITAL 5'],
  ['2282', 'ITAL 6'],
  ['2288', 'ITAL 106', 'SOCY 117E'],
  ['2290', 'LIT 185Q', 'LIT 114C'],
  ['2292', 'HAVC 157B'],
)
type T = typeof base
const swap = (t: T, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('italian-studies-minor 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual([])
  })

  it('accelerated ITAL 1A + 1B replace ITAL 1-3', () => {
    const t = swap(swap(swap(base, 'ITAL 1', 'ITAL 1A'), 'ITAL 2', 'ITAL 1B'), 'ITAL 3', null)
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual([])
  })

  it('the sequence must reach ITAL 6', () => {
    expect(failing(run(harness, { terms: swap(base, 'ITAL 6', null), attested: [] }))).toEqual(['sequence:unmet'])
  })

  it('no lower-division Italian: equivalent proficiency is a confirmation', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => !/^ITAL [1-6]$/.test(c)) }))
    expect(find(run(harness, { terms: t, attested: [] }), 'sequence-or-equivalent').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, attested: ['placement'] }))).toEqual([])
  })

  it('history requires SOCY 117E', () => {
    expect(failing(run(harness, { terms: swap(base, 'SOCY 117E', null), attested: [] }))).toEqual(['history:unmet'])
  })

  it('two literature courses', () => {
    expect(failing(run(harness, { terms: swap(base, 'LIT 114C', null), attested: [] }))).toEqual(['literature:unmet'])
  })

  it('art from the HAVC list', () => {
    expect(failing(run(harness, { terms: swap(base, 'HAVC 157B', 'HAVC 191N'), attested: [] }))).toEqual([])
  })

  it('two courses taught in Italian among the five', () => {
    // ITAL 101 (culture) is not on the taught-in-Italian list → only LIT 185Q
    const t = swap(base, 'ITAL 106', 'ITAL 101')
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['in-italian:unmet'])
    // ITAL 100 outside the five: cannot-check
    const t2 = [...t, { term: '2294', courses: ['ITAL 100'] }]
    expect(find(run(harness, { terms: t2, attested: [] }), 'in-italian').status).toBe('cannot-check')
  })

  it('LIT 102 can replace history after consulting the advisor', () => {
    const t = swap(base, 'SOCY 117E', 'LIT 102')
    expect(find(run(harness, { terms: t, attested: [] }), 'history').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, attested: ['LIT 102 substitution'] }))).toEqual([])
  })

  it('LIT 102 replaces only one requirement', () => {
    const t = swap(swap(base, 'SOCY 117E', 'LIT 102'), 'HAVC 157B', null)
    expect(failing(run(harness, { terms: t }))).toEqual(['art:unmet'])
  })

  it('LIT 102 does not replace the culture course', () => {
    const t = swap(base, 'ITAL 106', 'LIT 102')
    expect(find(run(harness, { terms: t }), 'culture').status).toBe('unmet')
  })

  it('an unlisted upper-division course is cannot-check for a category', () => {
    const t = swap(base, 'HAVC 157B', 'HAVC 191B')
    expect(find(run(harness, { terms: t, attested: [] }), 'art').status).toBe('cannot-check')
  })
})

describe('italian-studies-minor 2026-27 review', () => {
  it('a course declared from the Italian studies course list counts in its category only', () => {
    // "Students can consult [Italian studies course offerings](…) for each of the above categories."
    const t = swap(base, 'SOCY 117E', 'HIS 150A')
    expect(find(run(harness, { terms: t, attested: [] }), 'history').status).toBe('cannot-check')
    expect(find(run(harness, { terms: t, choices: { history_courses: 'HIS 150A' }, attested: [] }), 'history').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: { art_courses: 'HIS 150A' }, attested: [] }), 'history').status).toBe('unmet')
  })

  it('LIT 102 cannot replace the culture course', () => {
    // "LIT 102 can substitute for one of the Italian literature, history, or art history requirements"
    expect(find(run(harness, { terms: swap(base, 'ITAL 106', 'LIT 102') }), 'culture').status).toBe('unmet')
  })

  it('a lower-division Italian course is not an upper-division candidate', () => {
    expect(find(run(harness, { terms: swap(base, 'HAVC 157B', 'ITAL 4'), attested: [] }), 'art').status).toBe('unmet')
  })
})
