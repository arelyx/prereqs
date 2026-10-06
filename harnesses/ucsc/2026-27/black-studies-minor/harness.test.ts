import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'CRES 68'],
  ['2278', 'CRES 131', 'HIS 121A'],
  ['2280', 'CRES 129', 'LIT 161A'],
  ['2282', 'THEA 100B'],
)
const swap = (from: string, to: string, t = terms) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))

describe('black-studies-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('CRES 68 is required', () => {
    expect(failing(run(harness, { terms: swap('CRES 68', 'CRES 10') }))).toEqual(['cres68:unmet'])
  })

  it('five electives are required', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'THEA 100B') }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('at least two must be CRES courses', () => {
    const n = find(run(harness, { terms: swap('CRES 129', 'HIS 120') }), 'electives')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/CRES .*1 of 2/)
  })

  it('a listed course cross-listed with CRES counts toward the two CRES courses', () => {
    expect(failing(run(harness, { terms: swap('CRES 129', 'ANTH 130F') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CRES 129', 'CRES 130') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CRES 129', 'ARTG 142') }))).toEqual([])
  })

  it('a listed course NOT cross-listed with CRES does not count as CRES', () => {
    expect(find(run(harness, { terms: swap('CRES 129', 'FMST 147') }), 'electives').status).toBe('unmet')
  })

  it('unlisted courses do not count (even CRES ones)', () => {
    expect(find(run(harness, { terms: swap('THEA 100B', 'CRES 173') }), 'electives').status).toBe('unmet')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms, grades: { 'CRES 68': 'P', 'CRES 131': 'P' } }))).toEqual([])
  })
})
