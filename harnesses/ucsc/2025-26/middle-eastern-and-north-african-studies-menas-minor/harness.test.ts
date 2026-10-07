import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'ARBC 1', 'HIS 41'],
  ['2270', 'ARBC 2'],
  ['2272', 'ARBC 3'],
  ['2278', 'HIS 156B', 'POLI 140E'],
  ['2280', 'LIT 141D', 'HIS 157'],
  ['2282', 'CRES 173'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => base.map((t) => ({ ...t, courses: t.courses.filter((c) => c !== code) }))
const none: string[] = []

describe('middle-eastern-and-north-african-studies-menas-minor 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base, attested: none })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('ARBC 4 alone satisfies the language requirement', () => {
    const t = drop('ARBC 1').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'ARBC 2').map((c) => (c === 'ARBC 3' ? 'ARBC 4' : c)) }))
    expect(failing(run(harness, { terms: t, attested: none }))).toEqual([])
  })

  it('three quarters must be one language (two Arabic + one Hebrew is not)', () => {
    const r = run(harness, { terms: swap('ARBC 3', 'HEBR 1'), attested: none })
    expect(find(r, 'language').status).not.toBe('met')
  })

  it('2025-26: two quarters of Arabic are not enough (no placement-exam path)', () => {
    const r = run(harness, { terms: drop('ARBC 3'), attested: none })
    expect(find(r, 'language').status).toBe('unmet')
  })

  it('2025-26: no placement exam is offered — with no language courses the requirement is unmet, even attested', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('ARBC')) }))
    expect(find(run(harness, { terms: t, attested: 'all' }), 'language').status).toBe('unmet')
    expect(() => find(run(harness, { terms: t, attested: none }), 'attest:placement')).toThrow()
  })

  it('lower-division survey from the list is required', () => {
    expect(find(run(harness, { terms: swap('HIS 41', 'HIS 70A'), attested: none }), 'lower').status).toBe('unmet')
  })

  it('four upper-division courses are not five', () => {
    expect(find(run(harness, { terms: drop('CRES 173'), attested: none }), 'upper').status).toBe('unmet')
  })

  it('all six from one department fails the two-department rule', () => {
    const t = plan(
      ['2268', 'ARBC 1', 'HIS 41'], ['2270', 'ARBC 2'], ['2272', 'ARBC 3'],
      ['2278', 'HIS 156B', 'HIS 154'], ['2280', 'HIS 156A', 'HIS 157'], ['2282', 'HIS 170C'],
    )
    const r = run(harness, { terms: t, attested: none })
    expect(find(r, 'upper').status).toBe('met')
    expect(find(r, 'departments').status).toBe('unmet')
  })

  it('a spare course from another department fixes the two-department rule', () => {
    const t = plan(
      ['2268', 'ARBC 1', 'HIS 41'], ['2270', 'ARBC 2'], ['2272', 'ARBC 3'],
      ['2278', 'HIS 156B', 'HIS 154'], ['2280', 'HIS 156A', 'HIS 157'], ['2282', 'HIS 170C', 'LIT 81D'],
    )
    expect(find(run(harness, { terms: t, attested: none }), 'departments').status).toBe('met')
  })

  it('up to two P/NP among the six; three is too many', () => {
    expect(failing(run(harness, { terms: base, attested: none, grades: { 'HIS 41': 'P', 'HIS 157': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, attested: none, grades: { 'HIS 41': 'P', 'HIS 157': 'P', 'CRES 173': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })

  it('P/NP language courses pushing past two is a question, not a failure', () => {
    const r = run(harness, { terms: base, attested: none, grades: { 'HIS 41': 'P', 'HIS 157': 'P', 'ARBC 1': 'P' } })
    expect(find(r, 'pnp-limit').status).toBe('cannot-check')
  })
  it('review: the cross-listed LGST 184 counts like POLI 184 and as a second department', () => {
    const t = plan(['2268', 'HIS 41', 'ARBC 1', 'ARBC 2', 'ARBC 3'], ['2270', 'HIS 154', 'HIS 157', 'HIS 156A', 'HIS 156B', 'HIS 194W', 'LGST 184'])
    expect(failing(run(harness, { terms: t, attested: none }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CRES 173', 'LGST 184'), attested: none }))).toEqual([])
  })

  it('review: mixed Hebrew and Arabic quarters are not three of one language', () => {
    const t = swap('ARBC 1', 'HEBR 1').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'ARBC 2' ? 'HEBR 2' : c)) }))
    expect(find(run(harness, { terms: t, attested: none }), 'language').status).not.toBe('met')
  })

  it('2025-26: HIS 5B is not on the lower-division list', () => {
    expect(find(run(harness, { terms: swap('HIS 41', 'HIS 5B'), attested: none }), 'lower').status).toBe('unmet')
  })

  it('2025-26: ANTH 126, ANTH 130Y, HIS 163B, HIS 163C are not on the upper-division list', () => {
    for (const c of ['ANTH 126', 'ANTH 130Y', 'HIS 163B', 'HIS 163C'])
      expect(find(run(harness, { terms: swap('CRES 173', c), attested: none }), 'upper').status).toBe('unmet')
  })

  it('review: a second lower-division survey is not an upper-division course', () => {
    expect(find(run(harness, { terms: swap('CRES 173', 'HIS 58'), attested: none }), 'upper').status).toBe('unmet')
  })
})
