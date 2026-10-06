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

describe('digital-justice-studies-minor-formerly-gises 2025-26', () => {
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

describe('digital-justice-studies-minor-formerly-gises 2025-26 review (wave 2)', () => {
  it('LALS 186 [/SOCY 186] counts as a SOCY 110-189 elective', () => {
    expect(failing(run(harness, { terms: swap('SOCY 175', 'LALS 186') }))).toEqual([])
  })

  it('a 2-credit SOCY course is not an elective and not a possible substitute', () => {
    expect(find(run(harness, { terms: swap('SOCY 175', 'SOCY 113C') }), 'advanced').status).toBe('unmet')
  })

  it('a lower-division outside course is not a possible upper-division substitute', () => {
    expect(find(run(harness, { terms: swap('SOCY 175', 'CSE 20') }), 'advanced').status).toBe('unmet')
  })

  it('the same elective twice counts once', () => {
    expect(find(run(harness, { terms: [...swap('SOCY 175'), ...plan(['2290', 'SOCY 151'])] }), 'advanced').status).toBe('unmet')
  })

  it('SOCY 196G without SOCY 107A/B: core unmet (prerequisite order itself is not checked)', () => {
    expect(find(run(harness, { terms: swap('SOCY 107A') }), 'djs-core').status).toBe('unmet')
  })

  it('a failed SOCY 196G does not count', () => {
    expect(find(run(harness, { terms: base, grades: { 'SOCY 196G': 'NP' } }), 'practicum').status).toBe('unmet')
  })

  it('no-term credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: swap('SOCY 30A'), completed: ['SOCY 30A'] }))).toEqual([])
    const e = run(harness, { terms: [], attested: [] })
    expect(find(e, 'advanced').status).toBe('unmet')
    expect(find(e, 'practicum').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'SOCY 1', 'SOCY 10', 'SOCY 105A', 'SOCY 120', 'CMPM 146', 'SOCY 196S'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
  })
})
