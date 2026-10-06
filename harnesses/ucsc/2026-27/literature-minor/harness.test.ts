import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'LIT 1'],
  ['2270', 'LIT 61C'],
  ['2278', 'LIT 101', 'LIT 110A'],
  ['2280', 'LIT 124B', 'LIT 133C'],
  ['2282', 'LIT 189F'],
)
const swap = (from: string, to: string | null) =>
  terms.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('literature-minor 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('an 80-series course works instead of 60/61', () => {
    expect(failing(run(harness, { terms: swap('LIT 61C', 'LIT 80B') }))).toEqual([])
  })

  it('LIT 1 is required', () => {
    expect(failing(run(harness, { terms: swap('LIT 1', null) }))).toEqual(['lit1:unmet'])
  })

  it('LIT 101 is required', () => {
    expect(failing(run(harness, { terms: swap('LIT 101', 'LIT 102') }))).toEqual(['lit101:unmet'])
  })

  it('LIT 102 is below the LIT 108-189 range', () => {
    expect(find(run(harness, { terms: swap('LIT 133C', 'LIT 102') }), 'electives').status).toBe('unmet')
  })

  it('LIT 179A/179B do not count', () => {
    expect(failing(run(harness, { terms: swap('LIT 133C', 'LIT 179A') }))).toEqual(['electives:unmet'])
  })

  it('a lower-division LIT course is not an elective', () => {
    const t = [...swap('LIT 133C', null), { term: '2288', courses: ['LIT 80B'] }]
    expect(failing(run(harness, { terms: t }))).toEqual(['electives:unmet'])
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms, grades: { 'LIT 101': 'P', 'LIT 110A': 'P' } }))).toEqual([])
  })

  it('a failed elective does not count', () => {
    expect(find(run(harness, { terms, grades: { 'LIT 110A': 'F' } }), 'electives').status).toBe('unmet')
  })
})

describe('literature-minor 2026-27 review', () => {
  it('an internship (LIT 108A) or tutorial counts only with department approval', () => {
    // "Independent studies and internships may count toward the electives with department approval."
    for (const c of ['LIT 108A', 'LIT 199A']) {
      const t = swap('LIT 133C', c)
      expect(find(run(harness, { terms: t, attested: [] }), 'electives-approval').status).toBe('needs-attestation')
      expect(failing(run(harness, { terms: t, attested: ['department approval'] }))).toEqual([])
    }
    // not asked when four regular electives exist
    expect(failing(run(harness, { terms: [...terms, { term: '2288', courses: ['LIT 108A'] }], attested: [] }))).toEqual([])
  })

  it('2-credit courses, other-department courses and LIT 190-level seminars are not electives', () => {
    expect(find(run(harness, { terms: swap('LIT 133C', 'LIT 199F') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('LIT 133C', 'HIS 150A') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('LIT 133C', 'LIT 190A') }), 'electives').status).toBe('unmet')
  })

  it('empty plan', () => {
    expect(failing(run(harness, { terms: [] }))).toEqual(['lit1:unmet', 'lit60-80:unmet', 'lit101:unmet', 'electives:unmet'])
  })
})
