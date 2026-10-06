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

describe('middle-eastern-and-north-african-studies-menas-minor 2026-27', () => {
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

  it('two quarters of Arabic without the exam is not enough', () => {
    const r = run(harness, { terms: drop('ARBC 3'), attested: none })
    expect(find(r, 'language').status).toBe('needs-attestation')
  })

  it('placement exam above level 4 satisfies language', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('ARBC')) }))
    expect(failing(run(harness, { terms: t, attested: ['placement exam'] }))).toEqual([])
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
})
