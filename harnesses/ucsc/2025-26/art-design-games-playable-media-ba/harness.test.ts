import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'ARTG 10', 'ARTG 20', 'THEA 10'],
  ['2270', 'ARTG 40', 'HAVC 30'],
  ['2272', 'ARTG 50'],
  ['2278', 'ARTG 118', 'ARTG 138'],
  ['2280', 'ARTG 170A', 'ARTG 120'],
  ['2282', 'ARTG 181', 'CMPM 146'],
  ['2288', 'THEA 114', 'ART 101'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('art-design-games-playable-media-ba 2025-26', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('one course cannot fill two topic areas (THEA 113 is on Craft and Social lists)', () => {
    const t = swap(swap(terms, 'ARTG 118', 'THEA 113'), 'ARTG 138', null)
    expect(failing(run(harness, { terms: t }))).toHaveLength(1)
    const both = swap(swap(terms, 'ARTG 118', 'THEA 113'), 'ARTG 138', 'THEA 116A')
    expect(failing(run(harness, { terms: both }))).toEqual([])
  })

  it('the DC course may not also satisfy Performance/Portfolio/Exhibition', () => {
    const r = run(harness, { terms: swap(terms, 'ARTG 170A', null) })
    expect(failing(r)).toHaveLength(1)
    expect(['ppe', 'dc'].map((id) => find(r, id).status)).toContain('unmet')
  })

  it('ARTG 170A and 170B are equivalent: the second does not count', () => {
    const r = run(harness, { terms: swap(terms, 'ARTG 181', 'ARTG 170B') })
    expect(failing(r)).toHaveLength(1)
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('HAVC course must be 5 credits', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 30', 'HAVC 198F') }), 'havc').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'HAVC 30', 'HAVC 141L') }), 'havc').status).toBe('met')
  })

  it('needs one of ARTG 20/25/30', () => {
    expect(find(run(harness, { terms: swap(terms, 'ARTG 20', null) }), 'games-as').status).toBe('unmet')
  })

  it('lower-division arts elective: list only (MUSC 2 counts; ARTG 80G does not); transfers meet it by screening', () => {
    expect(find(run(harness, { terms: swap(terms, 'THEA 10', 'MUSC 2') }), 'arts-elective').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'THEA 10', 'ARTG 80G') }), 'arts-elective').status).toBe('unmet')
    const t = swap(terms, 'THEA 10', null)
    expect(find(run(harness, { terms: t, entry: 'transfer' }), 'arts-elective-or-screening').status).toBe('met')
    expect(find(run(harness, { terms: t, entry: 'transfer', attested: [] }), 'arts-elective-or-screening').status).toBe('needs-attestation')
  })

  it('electives: ARTG 199 and unlisted courses do not count; graduate GAME 231 is listed', () => {
    expect(find(run(harness, { terms: swap(terms, 'ART 101', 'ARTG 199') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'ART 101', 'ART 110') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'ART 101', 'GAME 231') }), 'electives').status).toBe('met')
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms, grades: { 'ARTG 10': 'P', 'ARTG 181': 'P' } }))).toEqual([])
  })

  it('a cross-listed partner code counts (LALS 161R = THEA 161R)', () => {
    expect(find(run(harness, { terms: swap(terms, 'ARTG 138', 'LALS 161R') }), 'social').status).toBe('met')
  })

  it('2025-26: ARTG 143 is not a Social Interventions course (it is on the PPE list)', () => {
    expect(find(run(harness, { terms: swap(terms, 'ARTG 138', 'ARTG 143') }), 'social').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'ARTG 170A', 'ARTG 143') }), 'ppe').status).toBe('met')
  })

  it('2025-26: MUSC 167 (2 credits) is listed but all upper-division courses must be at least 5 credits', () => {
    expect(find(run(harness, { terms: swap(terms, 'ART 101', 'MUSC 167') }), 'electives').status).toBe('unmet')
  })
  it('review: cross-listed partner codes count through the catalog (no alias list)', () => {
    expect(find(run(harness, { terms: swap(terms, 'ARTG 118', 'ART 147T') }), 'craft').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'ARTG 138', 'CRES 139') }), 'social').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'ART 101', 'ART 105') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'ART 101', 'ARTG 179') }), 'electives').status).toBe('met')
  })

  it('review: a cross-listed pair taken under both codes is one course', () => {
    // ARTG 143 = THEA 143: two elective slots cannot both use it
    const t = swap(swap(terms, 'ART 101', 'ARTG 143'), 'THEA 114', 'THEA 143')
    expect(failing(run(harness, { terms: t })).length).toBeGreaterThan(0)
  })

  it('review: transfer screening is not asked when a listed arts elective is in the plan', () => {
    const r = run(harness, { terms, entry: 'transfer', attested: [] })
    expect(failing(r)).toEqual([])
    expect(find(r, 'arts-elective').status).toBe('met')
  })

  it('review: a 5-credit HAVC seminar or cross-listed VAST 188J satisfies the HAVC course', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 30', 'HAVC 190A') }), 'havc').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'HAVC 30', 'VAST 188J') }), 'havc').status).toBe('met')
  })
})
