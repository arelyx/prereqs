import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'ANTH 1', 'ANTH 2'],
  ['2270', 'ANTH 3'],
  ['2278', 'ANTH 130A', 'ANTH 110A', 'ANTH 184'],
  ['2280', 'ANTH 101', 'ANTH 194M', 'ANTH 194A'],
  ['2282', 'ANTH 130I'],
)
const choices = { regional: 'ANTH 130A', sociocultural: 'ANTH 110A', archaeology: 'ANTH 184', biological: 'ANTH 101' }

describe('anthropology-minor 2026-27', () => {
  it('complete record with category assignments is met', () => {
    const r = run(harness, { terms, choices })
    expect(failing(r)).toEqual([])
  })

  it('without category assignments the categories are cannot-check, not met', () => {
    const r = run(harness, { terms })
    expect(find(r, 'cat-archaeology').status).toBe('cannot-check')
    expect(find(r, 'upper-seven').status).toBe('met')
  })

  it('one course cannot cover two categories', () => {
    const r = run(harness, { terms, choices: { ...choices, archaeology: 'ANTH 130A' } })
    expect(find(r, 'cat-archaeology').status).toBe('unmet')
  })

  it('an assigned course must be in the plan', () => {
    const r = run(harness, { terms, choices: { ...choices, biological: 'ANTH 102' } })
    expect(find(r, 'cat-biological').status).toBe('unmet')
  })

  it('independent study does not count toward the seven', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'ANTH 130I' ? 'ANTH 199' : c)) }))
    expect(find(run(harness, { terms: t, choices }), 'upper-seven').status).toBe('unmet')
  })

  it('lower division needs ANTH 1, 2 and 3', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'ANTH 3') }))
    expect(find(run(harness, { terms: t, choices }), 'lower').status).toBe('unmet')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms, choices, grades: { 'ANTH 194M': 'P' } }))).toEqual([])
  })
})
