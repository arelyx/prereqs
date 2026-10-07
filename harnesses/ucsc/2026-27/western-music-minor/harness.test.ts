import { describe, expect, it } from 'vitest'
import { verdict } from '@harness'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// The page's two-year planner.
const terms = plan(
  ['2268', 'MUSC 11A', 'MUSC 61', 'MUSC 2'],
  ['2270', 'MUSC 62', 'MUSC 2'],
  ['2272', 'MUSC 63', 'MUSC 9'],
  ['2278', 'MUSC 30A', 'MUSC 31', 'MUSC 60', 'MUSC 101B', 'MUSC 161A', 'MUSC 102'],
  ['2280', 'MUSC 30B', 'MUSC 31', 'MUSC 60', 'MUSC 105R', 'MUSC 161B', 'MUSC 102'],
  ['2282', 'MUSC 30C', 'MUSC 31', 'MUSC 60', 'MUSC 161', 'MUSC 165'],
)
const swap = (t: typeof terms, from: string, to: string | null, term?: string) =>
  t.map((q) => (term && q.term !== term ? q : { ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const noPetition = ['musc 60 waiver']

describe('western-music-minor 2026-27', () => {
  it('complete planner record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('all of MUSC 30A, 30B, 30C', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 30C', null) }), 'theory/30').status).toBe('unmet')
  })

  it('MUSC 31 needs three sections', () => {
    const t = swap(terms, 'MUSC 31', null, '2282')
    expect(find(run(harness, { terms: t }), 'musc31').status).toBe('unmet')
  })

  it('MUSC 60 is required unless waived', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'MUSC 60') }))
    expect(find(run(harness, { terms: t, attested: [] }), 'musc60').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['musc 60 waiver'] }), 'musc60').status).toBe('met')
  })

  it('three quarters each of LD lessons, LD ensembles, UD ensembles, UD lessons', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 63', null) }), 'ld-lessons').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'MUSC 9', null) }), 'ld-ensembles').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'MUSC 165', null), attested: noPetition }), 'ud-ensembles').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'MUSC 161', null) }), 'ud-lessons').status).toBe('unmet')
  })

  it('lessons and ensembles may repeat the same course', () => {
    const t = swap(swap(terms, 'MUSC 62', 'MUSC 61'), 'MUSC 63', 'MUSC 61')
    expect(find(run(harness, { terms: t }), 'ld-lessons').status).toBe('met')
  })

  it('extra lower-division ensembles replace upper-division ones only by petition', () => {
    const t = swap(terms, 'MUSC 165', 'MUSC 9')
    // The petition is asked only because a lower-division ensemble was needed.
    expect(find(run(harness, { terms: t, attested: noPetition }), 'ud-ensembles').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['ensemble petition', 'musc 60 waiver'] }), 'ud-ensembles').status).toBe('met')
    // ...and the same enrollment cannot fill both the LD and the UD slot.
    const short = swap(terms, 'MUSC 165', null)
    expect(find(run(harness, { terms: short, attested: ['ensemble petition'] }), 'ud-ensembles').status).toBe('unmet')
  })

  it('upper-division courses need a letter grade, ensembles and lessons included', () => {
    expect(find(run(harness, { terms, grades: { 'MUSC 105R': 'P' } }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'MUSC 165': 'P' }, attested: noPetition }), 'ud-ensembles').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'MUSC 165': 'P' } }), 'ud-ensembles').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'MUSC 161': 'P' } }), 'ud-lessons').status).toBe('unmet')
    expect(failing(run(harness, { terms, grades: { 'MUSC 30A': 'P', 'MUSC 61': 'P', 'MUSC 2': 'P', 'MUSC 11A': 'P' } }))).toEqual([])
  })

  it('MUSC 11C is not on the western minor history list', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 11A', 'MUSC 11C') }), 'history').status).toBe('unmet')
  })

  it('UD electives must come from the list', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 105R', 'MUSC 105H') }), 'ud-electives').status).toBe('unmet')
  })
})

// Adversarial review (2026-10-06).
describe('western-music-minor 2026-27 — review', () => {
  it('the ensemble petition is not asked when upper-division ensembles suffice', () => {
    // Petition path: "you can petition additional quarters of lower-division ensembles" — only when needed.
    const r = run(harness, { terms, attested: noPetition })
    expect(find(r, 'ud-ensembles').status).toBe('met')
    expect(() => find(r, 'attest:ld-ensemble-petition')).toThrow()
    expect(verdict(r).complete).toBe(true)
  })

  it('a petitioned lower-division ensemble may be P/NP; upper-division ones may not', () => {
    const t = swap(terms, 'MUSC 165', 'MUSC 9')
    expect(find(run(harness, { terms: t, grades: { 'MUSC 9': 'P' } }), 'ud-ensembles').status).toBe('met')
    expect(find(run(harness, { terms: t, grades: { 'MUSC 102': 'P' } }), 'ud-ensembles').status).toBe('unmet')
  })

  it('empty plan is incomplete', () => {
    const r = run(harness, { terms: [], attested: [] })
    expect(verdict(r).complete).toBe(false)
    expect(find(r, 'ud-electives').status).toBe('unmet')
  })

  it('MUSC 31: two sections passed and no failure is one short', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 31', null, '2278') }), 'musc31').status).toBe('unmet')
  })

  it('MUSC 63 (group lessons) three times fills the lower-division lessons; MUSC 161B is upper-division', () => {
    const t = swap(swap(terms, 'MUSC 61', 'MUSC 63'), 'MUSC 62', 'MUSC 63')
    expect(find(run(harness, { terms: t }), 'ld-lessons').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'MUSC 63', 'MUSC 161B') }), 'ld-lessons').status).toBe('unmet')
  })

  it('a lower-division lesson does not fill an upper-division lesson quarter', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 161', 'MUSC 61') }), 'ud-lessons').status).toBe('unmet')
  })

  it('MUSC 160 (5-credit opera theater) is an upper-division ensemble', () => {
    expect(find(run(harness, { terms: swap(terms, 'MUSC 165', 'MUSC 160') }), 'ud-ensembles').status).toBe('met')
  })

  it('transfer (no-term) MUSC 30A–C and 31 count', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => !/^MUSC 3[01]/.test(c)) }))
    const r = run(harness, { terms: t, completed: ['MUSC 30A', 'MUSC 30B', 'MUSC 30C', 'MUSC 31', 'MUSC 31', 'MUSC 31'] })
    expect(find(r, 'theory/30').status).toBe('met')
  })

  it('planned courses are in progress', () => {
    const r = run(harness, { terms, currentTerm: '2282' })
    expect(find(r, 'ud-lessons').status).toBe('in-progress')
  })
})
