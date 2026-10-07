import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'THEA 20', 'THEA 10', 'THEA 50'],
  ['2270', 'THEA 61A', 'THEA 30', 'THEA 50'],
  ['2272', 'THEA 61B', 'THEA 55A', 'THEA 50'],
  ['2278', 'THEA 61C', 'THEA 160'],
  ['2280', 'THEA 121', 'THEA 115A', 'THEA 161M'],
  ['2282', 'THEA 164', 'THEA 151'],
  ['2288', 'THEA 126', 'THEA 185'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const swapOne = (t: typeof terms, term: string, from: string, to: string | null) =>
  t.map((q) => (q.term === term ? { ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) } : q))

describe('theater-arts-ba 2026-27', () => {
  it('complete record (THEA 55A is lower-division elective + production)', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('THEA 50 must be taken three times', () => {
    const r = run(harness, { terms: swapOne(terms, '2272', 'THEA 50', null) })
    expect(find(r, 'thea50').status).toBe('unmet')
    expect(failing(r)).toEqual(['thea50:unmet'])
  })

  it('an upper-division production course may also be an upper-division elective', () => {
    // THEA 40 is the lower-division elective; THEA 151 (an elective) covers production
    expect(failing(run(harness, { terms: swap(terms, 'THEA 55A', 'THEA 40') }))).toEqual([])
  })

  it('production requirement is needed', () => {
    const t = swap(swap(terms, 'THEA 55A', 'THEA 40'), 'THEA 151', 'THEA 141')
    expect(failing(run(harness, { terms: t }))).toEqual(['production:unmet'])
  })

  it('lower-division elective must be an additional course', () => {
    const r = run(harness, { terms: swap(terms, 'THEA 55A', null) })
    expect(failing(r)).toEqual(['ld-elective:unmet'])
    expect(find(run(harness, { terms: swap(terms, 'THEA 55A', 'THEA 55B') }), 'ld-elective').status).toBe('unmet')
  })

  it('studio, history/theory and elective slots do not share a course', () => {
    const r = run(harness, { terms: swap(terms, 'THEA 126', null) })
    expect(failing(r)).toEqual(['ud-electives:unmet'])
    expect(find(run(harness, { terms: swap(terms, 'THEA 126', 'THEA 166') }), 'ud-electives').status).toBe('met')
  })

  it('a repeatable course may fill both electives', () => {
    expect(failing(run(harness, { terms: swap(terms, 'THEA 126', 'THEA 151') }))).toEqual([])
  })

  it('an unlisted upper-division THEA course leaves the electives to the advisor; excluded courses fail', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 126', 'THEA 161A') }), 'ud-electives').status).toBe('cannot-check')
    expect(find(run(harness, { terms: swap(terms, 'THEA 126', 'THEA 190') }), 'ud-electives').status).toBe('unmet')
  })

  it('THEA 160 and THEA 185 are required (DC, comprehensive)', () => {
    const r = run(harness, { terms: swap(terms, 'THEA 185', null) })
    expect(find(r, 'thea185').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'THEA 160', null) }), 'dc').status).toBe('unmet')
  })

  it('needs THEA 20 or 21, and every THEA 61 course', () => {
    expect(failing(run(harness, { terms: swap(terms, 'THEA 20', 'THEA 21') }))).toEqual([])
    expect(find(run(harness, { terms: swap(terms, 'THEA 61C', null) }), 'ld-core').status).toBe('unmet')
  })

  it('the other of THEA 20/21 can be the lower-division elective (production then from upper division)', () => {
    expect(failing(run(harness, { terms: swap(terms, 'THEA 55A', 'THEA 21') }))).toEqual([])
  })

  it('ARTG studio courses on the list count; P grades count', () => {
    expect(failing(run(harness, { terms: swap(terms, 'THEA 115A', 'ARTG 180'), grades: { 'THEA 160': 'P' } }))).toEqual([])
  })

  it('review: cross-listed partner codes count through the catalog', () => {
    expect(failing(run(harness, { terms: swap(terms, 'THEA 161M', 'COWL 161Y') }))).toEqual([])
    expect(failing(run(harness, { terms: swap(terms, 'THEA 115A', 'ART 143T') }))).toEqual([])
    expect(failing(run(harness, { terms: swap(terms, 'THEA 164', 'CRES 142') }))).toEqual([])
  })

  it('review: THEA 50 credit with no term (transfer/no-term) counts per enrollment', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'THEA 50') }))
    expect(failing(run(harness, { terms: t, completed: ['THEA 50', 'THEA 50', 'THEA 50'] }))).toEqual([])
  })

})
