import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'HIS 74', 'HEBR 1'],
  ['2270', 'HEBR 2'],
  ['2278', 'HIS 155', 'LIT 164C'],
  ['2280', 'PHIL 148', 'HIS 167B'],
  ['2282', 'HIS 178C'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => base.map((t) => ({ ...t, courses: t.courses.filter((c) => c !== code) }))

describe('jewish-studies-minor 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('lower-division core must come from the list', () => {
    expect(find(run(harness, { terms: swap('HIS 74', 'HIS 2A') }), 'ld-core').status).toBe('unmet')
  })

  it('two upper-division core courses are not three', () => {
    expect(find(run(harness, { terms: swap('PHIL 148', 'HIS 2B') }), 'ud-core').status).toBe('unmet')
  })

  it('extra core courses count as electives', () => {
    const t = swap('HIS 167B', 'HIS 76').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'HEBR 2' ? 'LIT 164G' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('two of the electives must be 5-credit upper-division', () => {
    const r = run(harness, { terms: swap('HIS 178C', 'HEBR 3') })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'electives').detail).toMatch(/upper-division: 1 of 2/)
  })

  it('three electives are not four', () => {
    expect(find(run(harness, { terms: drop('HEBR 2') }), 'electives').status).toBe('unmet')
  })

  it('an unlisted course is not an elective', () => {
    expect(find(run(harness, { terms: swap('HEBR 2', 'HIS 10A') }), 'electives').status).toBe('unmet')
  })

  it('up to two P/NP; three is too many', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HEBR 1': 'P', 'HEBR 2': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'HEBR 1': 'P', 'HEBR 2': 'P', 'HIS 74': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })
})
