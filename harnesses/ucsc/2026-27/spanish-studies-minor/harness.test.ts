import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'SPAN 1', 'LING 50'],
  ['2270', 'SPAN 2'],
  ['2272', 'SPAN 3'],
  ['2278', 'SPAN 4'],
  ['2280', 'SPAN 5'],
  ['2282', 'SPAN 6'],
  ['2288', 'SPAN 114', 'LIT 189C'],
  ['2290', 'SPAN 150', 'LIT 189A'],
  ['2292', 'SPAN 141'],
)
type T = typeof base
const swap = (t: T, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const noLower = (t: T) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => !/^SPAN [1-6]M?$/.test(c)) }))

describe('spanish-studies-minor 2026-27', () => {
  it('complete regular-track record is met', () => {
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual([])
  })

  it('heritage track SPHS 4-6 works', () => {
    const t = [...noLower(base), { term: '2266', courses: ['SPHS 4', 'SPHS 5', 'SPHS 6'] }]
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual([])
  })

  it('placed into SPAN 4: SPAN 1-3 are implied', () => {
    const t = swap(swap(swap(base, 'SPAN 1', null), 'SPAN 2', null), 'SPAN 3', null)
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual([])
  })

  it('SPAN 5M substitutes for SPAN 5', () => {
    expect(failing(run(harness, { terms: swap(base, 'SPAN 5', 'SPAN 5M'), attested: [] }))).toEqual([])
  })

  it('a track stopped short of level 6 is unmet', () => {
    const r = run(harness, { terms: swap(base, 'SPAN 6', null) })
    expect(find(r, 'track').status).toBe('unmet')
  })

  it('no lower-division Spanish at all: equivalent proficiency is a confirmation', () => {
    expect(find(run(harness, { terms: noLower(base), attested: [] }), 'track').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: noLower(base), attested: ['equivalent proficiency'] }))).toEqual([])
  })

  it('LING 50 is required', () => {
    expect(failing(run(harness, { terms: swap(base, 'LING 50', null) }))).toEqual(['ling50:unmet'])
  })

  it('each core course is required', () => {
    expect(failing(run(harness, { terms: swap(base, 'LIT 189C', 'LIT 189F') }))).toEqual(['core-spanish-studies:unmet'])
    expect(failing(run(harness, { terms: swap(base, 'SPAN 150', 'SPAN 151') }))).toEqual(['core-linguistics:unmet'])
    expect(failing(run(harness, { terms: swap(base, 'SPAN 114', 'SPHS 115') }))).toEqual([])
  })

  it('a core course does not double as the elective', () => {
    const t = swap(base, 'SPAN 141', 'LIT 189B')
    // LIT 189B is a core alternative but not on the elective list
    expect(failing(run(harness, { terms: t }))).toEqual(['elective:unmet'])
  })

  it('SPAN 6 is not an upper-division elective (garbled row)', () => {
    const t = swap(base, 'SPAN 141', null)
    expect(failing(run(harness, { terms: t }))).toEqual(['elective:unmet'])
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'SPAN 114': 'P', 'SPAN 4': 'P' } }))).toEqual([])
  })
})
