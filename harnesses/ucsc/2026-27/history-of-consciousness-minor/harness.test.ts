import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'HISC 1'],
  ['2278', 'HISC 102', 'HISC 103'],
  ['2280', 'HISC 110', 'HISC 120'],
  ['2282', 'HISC 199'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))

describe('history-of-consciousness-minor 2026-27', () => {
  it('HISC 1 + five HISC 100–199 is complete', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('HISC 1 is required', () => {
    expect(find(run(harness, { terms: swap('HISC 1', 'HISC 5') }), 'hisc1').status).toBe('unmet')
  })

  it('only four upper-division HISC courses is not enough', () => {
    expect(find(run(harness, { terms: swap('HISC 199', 'HISC 80N') }), 'upper-five').status).toBe('unmet')
  })

  it('review: a graduate seminar counts for one upper-division course only by petition (asked only when used)', () => {
    const t = swap('HISC 199', 'HISC 203A')
    expect(find(run(harness, { terms: t, attested: [] }), 'attest:grad-seminar-petition').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, attested: ['graduate seminar petition'] }))).toEqual([])
    expect(() => find(run(harness, { terms: base, attested: [] }), 'attest:grad-seminar-petition')).toThrow()
  })

  it('review: only one graduate seminar may substitute', () => {
    const t = swap('HISC 199', 'HISC 203A').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'HISC 120' ? 'HISC 205' : c)) }))
    expect(find(run(harness, { terms: t }), 'upper-five').status).toBe('unmet')
  })

  it('review: a spare graduate seminar is not used (nor petitioned) when five HISC 100–199 are present', () => {
    const r = run(harness, { terms: [...base, { term: '2288', courses: ['HISC 203A'] }], attested: [] })
    expect(failing(r)).toEqual([])
  })

  it('P counts; C counts; C- does not', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HISC 102': 'P', 'HISC 1': 'C' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'HISC 102': 'C-' } }), 'upper-five').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'HISC 1': 'D' } }), 'hisc1').status).toBe('unmet')
  })

  it('courses from other departments do not count', () => {
    expect(find(run(harness, { terms: swap('HISC 120', 'HIS 120') }), 'upper-five').status).toBe('unmet')
  })
  it('review: a repeatable HISC 199 taken twice counts twice', () => {
    expect(failing(run(harness, { terms: [...swap('HISC 120', 'HISC 199')] }))).toEqual([])
  })

  it('review: a cross-listed partner code (CRES 117 = HISC 117) counts', () => {
    expect(failing(run(harness, { terms: swap('HISC 120', 'CRES 117') }))).toEqual([])
  })

  it('review: a non-repeatable course retaken counts once', () => {
    expect(find(run(harness, { terms: swap('HISC 120', 'HISC 110') }), 'upper-five').status).toBe('unmet')
  })
})
