import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'THEA 30', 'THEA 37'],
  ['2270', 'THEA 50'],
  ['2278', 'THEA 131C', 'THEA 164'],
  ['2280', 'THEA 124', 'THEA 137'],
  ['2282', 'THEA 161D'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('dance-minor 2025-26', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('THEA 50 is required', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 50', null) }), 'thea50').status).toBe('unmet')
  })

  it('an extra creative-practice or critical-studies course may be an elective, but not double counted', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 161D', 'THEA 135') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'THEA 161D', 'THEA 165') }), 'electives').status).toBe('met')
    const r = run(harness, { terms: swap(terms, 'THEA 131C', null) })
    expect(failing(r)).toHaveLength(1)
  })

  it('THEA 139 may fill up to two electives, not three', () => {
    const two = swap(swap(terms, 'THEA 124', 'THEA 139'), 'THEA 137', 'THEA 139')
    expect(find(run(harness, { terms: two }), 'electives').status).toBe('met')
    const three = swap(two, 'THEA 161D', 'THEA 139')
    expect(find(run(harness, { terms: three }), 'electives').status).toBe('unmet')
  })

  it('excluded courses (THEA 158, 190, 199) do not count as electives', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 161D', 'THEA 158') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'THEA 161D', 'THEA 199') }), 'electives').status).toBe('unmet')
  })

  it('lower-division cross-cultural course must come from its list', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 37', 'THEA 36') }), 'ld-cross').status).toBe('unmet')
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms, grades: { 'THEA 164': 'P', 'THEA 50': 'P' } }))).toEqual([])
  })

  it('ARTG 143 (Ecofutures) fills critical studies', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 164', 'ARTG 143') }), 'ud-critical').status).toBe('met')
  })

  it('review: cross-listed partner codes count through the catalog (THEA 143, LALS 161R)', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 164', 'THEA 143') }), 'ud-critical').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'THEA 164', 'LALS 161R') }), 'ud-critical').status).toBe('met')
  })

  it('review: a non-repeatable course taken twice fills only one slot', () => {
    // THEA 131C is not repeatable for credit: practice slot + elective would need two courses
    const t = [...swap(terms, 'THEA 161D', null), { term: '2284', courses: ['THEA 131C'] }]
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('review: an unlisted upper-division course is not an elective without approval (note only)', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 161D', 'THEA 161M') }), 'electives').status).toBe('unmet')
  })

})
