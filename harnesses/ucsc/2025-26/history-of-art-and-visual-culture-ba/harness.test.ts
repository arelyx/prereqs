import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// LD: Africa, Asia, Europe/Americas, Mediterranean → UD regional: Native Americas, Oceania.
const terms = plan(
  ['2268', 'HAVC 10', 'HAVC 22'],
  ['2270', 'HAVC 30', 'HAVC 51', 'HAVC 100A'],
  ['2278', 'HAVC 160A', 'HAVC 170', 'HAVC 111'],
  ['2280', 'HAVC 122A', 'HAVC 135B', 'HAVC 185'],
  ['2288', 'HAVC 188A', 'HAVC 190B'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('history-of-art-and-visual-culture-ba 2025-26 general', () => {
  it('complete record (no concentration declared = general major)', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('two lower-division courses from the same region fail', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 51', 'HAVC 41') }), 'lower').status).toBe('unmet')
  })

  it('upper-division regional course from a region already studied at lower division fails', () => {
    const r = run(harness, { terms: swap(terms, 'HAVC 170', 'HAVC 115') })
    expect(find(r, 'ud-regional').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('cross-regional HAVC 180-189 is an elective, not a regional course', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 170', 'HAVC 186') }), 'ud-regional').status).toBe('unmet')
  })

  it('HAVC 80 can stand for Africa, Native Americas or Oceania', () => {
    expect(failing(run(harness, { terms: swap(terms, 'HAVC 10', 'HAVC 80') }))).toEqual([])
    // LD 80, 22, 30, 51 + UD 116 (Africa), 170 (Oceania): HAVC 80 stands for Native Americas
    const t = swap(swap(terms, 'HAVC 10', 'HAVC 80'), 'HAVC 160A', 'HAVC 116')
    expect(find(run(harness, { terms: t }), 'ud-regional').status).toBe('met')
    // LD 10, 22, 30, 80 + UD 152 (Mediterranean), 170 (Oceania): HAVC 80 = Native Americas
    const med = swap(swap(terms, 'HAVC 51', 'HAVC 80'), 'HAVC 160A', 'HAVC 152')
    expect(find(run(harness, { terms: med }), 'ud-regional').status).toBe('met')
    const bad = swap(swap(swap(terms, 'HAVC 51', 'HAVC 80'), 'HAVC 160A', 'HAVC 165'), 'HAVC 170', 'HAVC 178')
    expect(find(run(harness, { terms: bad }), 'ud-regional').status).toBe('unmet') // HAVC 80 cannot stand for the Mediterranean
  })

  it('HAVC 80 has no region left when Africa, Native Americas and Oceania are already taken', () => {
    const t = plan(
      ['2268', 'HAVC 10', 'HAVC 60', 'HAVC 70', 'HAVC 80'],
      ['2270', 'HAVC 100A', 'HAVC 122A', 'HAVC 135B'],
      ['2278', 'HAVC 151', 'HAVC 185', 'HAVC 188A', 'HAVC 141L', 'HAVC 111'],
      ['2288', 'HAVC 190B'],
    )
    expect(find(run(harness, { terms: t }), 'lower').status).toBe('unmet')
  })

  it('with five lower-division courses, the right four are matched to the regional courses', () => {
    // LD Af, As, Eu, NA, Oc → UD must be Mediterranean + one more; UD 151 (Med) + 111 (Af) works using LD As, Eu, NA, Oc
    const t = plan(
      ['2268', 'HAVC 10', 'HAVC 22', 'HAVC 30', 'HAVC 65', 'HAVC 70'],
      ['2270', 'HAVC 100A', 'HAVC 151', 'HAVC 111'],
      ['2278', 'HAVC 122A', 'HAVC 135B', 'HAVC 185', 'HAVC 188A', 'HAVC 141L'],
      ['2288', 'HAVC 190B'],
    )
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('senior seminar required; a second seminar counts as an elective', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 190B', null) }), 'seminar').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap(terms, 'HAVC 185', 'HAVC 191A') }))).toEqual([])
  })

  it('HAVC 100A required (DC)', () => {
    const r = run(harness, { terms: swap(terms, 'HAVC 100A', null) })
    expect(find(r, 'havc100a').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('needs five electives besides the regional courses', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 188A', null) }), 'electives').status).toBe('unmet')
  })

  it('C- does not count; P does', () => {
    expect(find(run(harness, { terms, grades: { 'HAVC 100A': 'C-' } }), 'havc100a').status).toBe('unmet')
    expect(failing(run(harness, { terms, grades: { 'HAVC 100A': 'P', 'HAVC 22': 'P' } }))).toEqual([])
  })
})

describe('history-of-art-and-visual-culture-ba 2025-26 CHM', () => {
  const C = { concentration: 'Curation, Heritage, and Museums' }
  const chm = plan(
    ['2268', 'HAVC 10', 'HAVC 22', 'HAVC 40'],
    ['2270', 'HAVC 51', 'HAVC 100A'],
    ['2278', 'HAVC 160A', 'HAVC 170', 'HAVC 141L'],
    ['2280', 'HAVC 141M', 'HAVC 188A', 'HAVC 111'],
    ['2288', 'HAVC 122A', 'HAVC 190B', 'ANTH 187'],
  )

  it('complete CHM record (approved courses overlap LD/electives)', () => {
    expect(failing(run(harness, { terms: chm, choices: C }))).toEqual([])
  })

  it('the same record is incomplete for CHM with only three approved courses', () => {
    const t = swap(chm, 'ANTH 187', null)
    expect(failing(run(harness, { terms: t, choices: C }))).toEqual([]) // 40, 141L, 141M, 188A = four
    const three = swap(t, 'HAVC 141M', 'HAVC 135B')
    expect(find(run(harness, { terms: three, choices: C }), 'chm').status).toBe('unmet')
    expect(failing(run(harness, { terms: three }))).toEqual([])
  })

  it('at least two must be HAVC-sponsored', () => {
    const t = swap(swap(swap(chm, 'HAVC 141L', 'HAVC 135B'), 'HAVC 141M', 'HIS 104D'), 'HAVC 188A', 'ANTH 196J')
    // approved: HAVC 40, ANTH 187, HIS 104D, ANTH 196J → one HAVC
    const r = run(harness, { terms: [...t, { term: '2290', courses: ['HAVC 141P'] }], choices: C })
    expect(find(r, 'chm').status).toBe('unmet')
  })

  it('review: HAVC 199 in the plan makes a short concentration a petition attestation (asked only then)', () => {
    const three = swap(swap(chm, 'ANTH 187', null), 'HAVC 141M', 'HAVC 135B')
    const t = [...three, { term: '2290', courses: ['HAVC 199'] }]
    expect(find(run(harness, { terms: t, choices: C, attested: [] }), 'chm-or-petition').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices: C, attested: ['HAVC 199 petition'] }), 'chm-or-petition').status).toBe('met')
    // not asked when the approved list already has four
    expect(() => find(run(harness, { terms: [...chm, { term: '2290', courses: ['HAVC 199'] }], choices: C, attested: [] }), 'chm-or-petition')).toThrow()
    // two short: one petitioned course cannot complete it
    const two = swap(three, 'HAVC 141L', 'HAVC 141A')
    expect(find(run(harness, { terms: [...two, { term: '2290', courses: ['HAVC 199'] }], choices: C }), 'chm').status).toBe('unmet')
  })

  it('review: upper-division non-HAVC concentration courses are major electives for CHM students', () => {
    // electives: 141L, 141M, 111 + ANTH 187 + ANTH 187B (two HAVC electives replaced)
    const t = plan(
      ['2268', 'HAVC 10', 'HAVC 22', 'HAVC 40'],
      ['2270', 'HAVC 51', 'HAVC 100A'],
      ['2278', 'HAVC 160A', 'HAVC 170', 'HAVC 141L'],
      ['2280', 'HAVC 141M', 'HAVC 111', 'ANTH 187'],
      ['2288', 'ANTH 187B', 'HAVC 190B'],
    )
    expect(failing(run(harness, { terms: t, choices: C }))).toEqual([])
    // the general major does not count ANTH courses as electives
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('2025-26: HAVC 141Z and VAST 188J are not approved concentration courses', () => {
    for (const c of ['HAVC 141Z', 'VAST 188J']) {
      const t = swap(swap(chm, 'HAVC 188A', c), 'ANTH 187', null)
      // approved left: HAVC 40, 141L, 141M — three
      expect(find(run(harness, { terms: t, choices: C }), 'chm').status).toBe('unmet')
    }
    // HAVC 188J is still a major elective (any HAVC 110-191)
    expect(find(run(harness, { terms: swap(terms, 'HAVC 188A', 'HAVC 188J') }), 'electives').status).toBe('met')
  })
})
