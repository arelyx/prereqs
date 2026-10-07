import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'CHIN 1', 'HIS 40B'],
  ['2270', 'CHIN 2'],
  ['2272', 'CHIN 3'],
  ['2278', 'CHIN 4'],
  ['2280', 'CHIN 5'],
  ['2282', 'CHIN 6'],
  ['2288', 'CHIN 103', 'HIS 140C'],
  ['2290', 'CHIN 104', 'POLI 141'],
  ['2292', 'HAVC 122E'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))
const drop = (...codes: string[]) => base.map((t) => ({ ...t, courses: t.courses.filter((c) => !codes.includes(c)) }))

describe('east-asian-studies-minor 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('a student who placed past CHIN 1–6 is still complete (the six courses are what count)', () => {
    expect(failing(run(harness, { terms: drop('CHIN 1', 'CHIN 2', 'CHIN 3', 'CHIN 4', 'CHIN 5', 'CHIN 6') }))).toEqual([])
  })

  it('core survey must be HIS 40A/40B/80C/81', () => {
    expect(find(run(harness, { terms: swap('HIS 40B', 'HIS 44') }), 'core').status).toBe('unmet')
  })

  it('upper-division language: one Chinese + one Japanese does not count', () => {
    const r = run(harness, { terms: swap('CHIN 104', 'JAPN 103') })
    expect(find(r, 'ud-language').status).toBe('unmet')
  })

  it('two Japanese upper-division courses count', () => {
    const t = swap('CHIN 103', 'JAPN 103').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CHIN 104' ? 'JAPN 109' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('a third upper-division language course counts as an elective', () => {
    expect(failing(run(harness, { terms: swap('HAVC 122E', 'CHIN 105') }))).toEqual([])
  })

  it('two electives are not three', () => {
    expect(find(run(harness, { terms: drop('HAVC 122E') }), 'electives').status).toBe('unmet')
  })

  it('an unlisted upper-division course is not an elective', () => {
    expect(find(run(harness, { terms: swap('HAVC 122E', 'HIS 172A') }), 'electives').status).toBe('unmet')
  })

  it('CHIN 199 counts as the one individual study', () => {
    expect(failing(run(harness, { terms: swap('HAVC 122E', 'CHIN 199') }))).toEqual([])
  })

  it('HIS 199 may be the individual study, but topicality must be confirmed', () => {
    expect(find(run(harness, { terms: swap('HAVC 122E', 'HIS 199') }), 'electives').status).toBe('cannot-check')
  })

  it('only one individual study among the three electives', () => {
    const t = swap('HAVC 122E', 'CHIN 199').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'POLI 141' ? 'JAPN 199' : c)) }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('up to two P/NP; three is too many', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HIS 40B': 'P', 'POLI 141': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'HIS 40B': 'P', 'POLI 141': 'P', 'CHIN 103': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })

  it('the cross-listed HIS 141A counts like LIT 141B', () => {
    expect(failing(run(harness, { terms: swap('HAVC 122E', 'HIS 141A') }))).toEqual([])
  })
  it('review: the cross-listed LGST 126 counts like SOCY 128 and is not flagged as off-list', () => {
    expect(failing(run(harness, { terms: swap('HAVC 122E', 'LGST 126') }))).toEqual([])
  })

  it('review: with a listed CHIN 199 and an off-list HIS 199, the listed one is the individual study', () => {
    const t = [...swap('HAVC 122E', 'HIS 199'), { term: '2294', courses: ['CHIN 199'] }]
    const r = run(harness, { terms: t })
    expect(find(r, 'electives').status).toBe('met')
    expect(find(r, 'electives').used?.map((e) => e.display)).toContain('CHIN 199')
  })

  it('review: a core survey is not an upper-division elective', () => {
    expect(find(run(harness, { terms: swap('HAVC 122E', 'HIS 40A') }), 'electives').status).toBe('unmet')
  })

  it('review: a 2-credit 199F is not a 5-credit elective', () => {
    expect(find(run(harness, { terms: swap('HAVC 122E', 'HIS 199F') }), 'electives').status).toBe('unmet')
  })

  it('review: mixed Chinese and Japanese: two of one language + extras as electives', () => {
    const t = plan(['2268', 'HIS 81'], ['2270', 'CHIN 103', 'JAPN 103', 'JAPN 104', 'CHIN 104', 'JAPN 105'])
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
