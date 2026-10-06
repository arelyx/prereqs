import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'HAVC 10', 'HAVC 22', 'HAVC 30'],
  ['2278', 'HAVC 100A', 'HAVC 111', 'HAVC 135B'],
  ['2280', 'HAVC 151', 'HAVC 185', 'HAVC 190B'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('history-of-art-and-visual-culture-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('two lower-division courses from one region fail (30s and 40s are both Europe and the Americas)', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 41') }), 'lower').status).toBe('unmet')
  })

  it('HAVC 80 counts for Africa / Native Americas / Oceania', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 80') }), 'lower').status).toBe('met')
    // HAVC 10 (Africa), 60 (Native Americas), 80 → 80 stands for Oceania
    const rest = terms.slice(1).map((q) => [q.term, ...q.courses] as [string, ...string[]])
    expect(find(run(harness, { terms: plan(['2268', 'HAVC 10', 'HAVC 60', 'HAVC 80'], ...rest) }), 'lower').status).toBe('met')
    // HAVC 20 and 22 are both Asia: HAVC 80 cannot stand for Asia
    expect(find(run(harness, { terms: plan(['2268', 'HAVC 20', 'HAVC 22', 'HAVC 80'], ...rest) }), 'lower').status).toBe('unmet')
  })

  it('HAVC 85 is not a regional lower-division course', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 85') }), 'lower').status).toBe('unmet')
  })

  it('needs six upper-division courses numbered 100-191 (HAVC 199 does not count)', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 190B', 'HAVC 199') }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'HAVC 190B', null) }), 'upper').status).toBe('unmet')
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms, grades: { 'HAVC 10': 'P', 'HAVC 151': 'P' } }))).toEqual([])
  })

  it('review: a lower-division course retaken counts once (two regions still needed)', () => {
    const t = [...swap(terms, 'HAVC 22', null), { term: '2290', courses: ['HAVC 10'] }]
    expect(find(run(harness, { terms: t }), 'lower').status).toBe('unmet')
  })

  it('review: VAST 188J counts as HAVC 188J; HAVC 195 and 2-credit 199F do not', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 151', 'VAST 188J') }), 'upper').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'HAVC 151', 'HAVC 195') }), 'upper').status).toBe('unmet')
  })

})
