import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'SOCY 30A'],
  ['2270', 'SOCY 107A'],
  ['2272', 'SOCY 107B'],
  ['2278', 'SOCY 196G', 'SOCY 132'],
  ['2280', 'SOCY 151', 'SOCY 175'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('digital-justice-studies-minor-formerly-gises 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('SOCY 30A is required', () => {
    expect(find(run(harness, { terms: swap('SOCY 30A') }), 'socy30a').status).toBe('unmet')
  })

  it('SOCY 107A and 107B are both required', () => {
    expect(find(run(harness, { terms: swap('SOCY 107B') }), 'djs-core').status).toBe('unmet')
  })

  it('three electives needed (SOCY 110-189)', () => {
    expect(find(run(harness, { terms: swap('SOCY 175') }), 'advanced').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('SOCY 175', 'SOCY 105A') }), 'advanced').status).toBe('cannot-check')
  })

  it('an outside upper-division course may be on the DJS list: cannot-check', () => {
    expect(find(run(harness, { terms: swap('SOCY 175', 'CMPM 146') }), 'advanced').status).toBe('cannot-check')
  })

  it('SOCY 196G and the mounted deliverable are required', () => {
    expect(find(run(harness, { terms: swap('SOCY 196G') }), 'practicum').status).toBe('unmet')
    expect(find(run(harness, { terms: base, attested: [] }), 'practicum').status).toBe('needs-attestation')
  })

  it('SOCY 107A cannot double as an elective', () => {
    expect(find(run(harness, { terms: swap('SOCY 175', 'SOCY 107A') }), 'advanced').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'SOCY 30A': 'P', 'SOCY 151': 'P' } }))).toEqual([])
  })
})
