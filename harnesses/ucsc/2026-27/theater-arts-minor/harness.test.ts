import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'THEA 61A', 'THEA 20'],
  ['2270', 'THEA 50'],
  ['2278', 'THEA 160', 'THEA 161M'],
  ['2280', 'LIT 111D', 'THEA 121'],
  ['2282', 'THEA 151'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('theater-arts-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('only one of THEA 137/137A/139/151/151A/151I/155 counts as a studio', () => {
    const r = run(harness, { terms: swap(terms, 'THEA 121', 'THEA 155') })
    expect(find(r, 'studio').status).toBe('unmet')
  })

  it('needs three history/theory/critical studies courses', () => {
    expect(find(run(harness, { terms: swap(terms, 'LIT 111D', 'LIT 111A') }), 'htcs').status).toBe('unmet')
  })

  it('THEA 50 is required', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 50', null) }), 'thea50').status).toBe('unmet')
  })

  it('needs a THEA 61 drama course', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 61A', null) }), 'ld-drama').status).toBe('unmet')
  })

  it('a second THEA 61 course is not a practice course', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 20', 'THEA 61B') }), 'ld-practice').status).toBe('unmet')
  })

  it('excluded courses do not count (THEA 190 as a studio)', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 121', 'THEA 190') }), 'studio').status).toBe('unmet')
  })

  it('P grades count; NP does not', () => {
    expect(failing(run(harness, { terms, grades: { 'THEA 160': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms, grades: { 'THEA 160': 'NP' } }), 'htcs').status).toBe('unmet')
  })

  it('review: cross-listed partner codes count through the catalog', () => {
    expect(failing(run(harness, { terms: swap(terms, 'THEA 121', 'ART 147T') }))).toEqual([])
    expect(failing(run(harness, { terms: swap(terms, 'THEA 161M', 'LALS 161R') }))).toEqual([])
  })

})
