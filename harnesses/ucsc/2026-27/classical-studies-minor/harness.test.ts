import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LATN 1'],
  ['2270', 'LATN 2'],
  ['2278', 'LIT 186A', 'HIS 161B'],
  ['2280', 'LIT 186B', 'PHIL 100A'],
  ['2282', 'HAVC 152'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))

describe('classical-studies-minor 2026-27', () => {
  it('Latin sequence + LIT 186A + four listed courses is complete', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('Greek sequence works too', () => {
    const t = swap('LATN 1', 'GREE 1').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LATN 2' ? 'GREE 2' : c === 'LIT 186A' ? 'LIT 184A' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('mixing GREE 1 with LATN 2 is not a sequence', () => {
    expect(find(run(harness, { terms: swap('LATN 1', 'GREE 1') }), 'language').status).toBe('unmet')
  })

  it('LIT 184A or 186A is required (another Latin course does not substitute)', () => {
    const t = swap('LIT 186A', 'LIT 186C')
    expect(find(run(harness, { terms: t }), 'intro').status).toBe('unmet')
  })

  it('taking both LIT 184A and 186A: the second counts among the four', () => {
    const t = swap('HAVC 152', 'LIT 184A')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('one course cannot fill both the intro and one of the four', () => {
    const t = swap('HAVC 152', 'HIS 2A')
    expect(find(run(harness, { terms: t }), 'four').status).toBe('unmet')
  })

  it('an unlisted upper-division course does not count', () => {
    expect(find(run(harness, { terms: swap('HAVC 152', 'HIS 172A') }), 'four').status).toBe('unmet')
  })

  it('the cross-listed HIS 159M counts like LIT 159M', () => {
    expect(failing(run(harness, { terms: swap('HAVC 152', 'HIS 159M') }))).toEqual([])
  })

  it('up to two P/NP; a third is not allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'LATN 1': 'P', 'HIS 161B': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'LATN 1': 'P', 'HIS 161B': 'P', 'HAVC 152': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })
})
