import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'HIS 10A', 'HIS 40A'],
  ['2270', 'HIS 70B'],
  ['2278', 'HIS 100', 'HIS 150A'],
  ['2280', 'HIS 160A', 'HIS 172A'],
  ['2282', 'HIS 185J'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => base.map((t) => ({ ...t, courses: t.courses.filter((c) => c !== code) }))

describe('history-minor 2026-27', () => {
  it('three lower-division + five upper-division HIS courses is complete', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('the three may be upper-division too', () => {
    const t = swap('HIS 10A', 'HIS 101D').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'HIS 40A' ? 'HIS 140B' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('only four upper-division courses is not enough', () => {
    const t = swap('HIS 185J', 'HIS 2A')
    const r = run(harness, { terms: t })
    expect(find(r, 'upper').status).toBe('unmet')
  })

  it('seven courses total is not enough', () => {
    expect(find(run(harness, { terms: drop('HIS 70B') }), 'lower').status).toBe('unmet')
  })

  it('non-HIS courses do not count', () => {
    expect(find(run(harness, { terms: swap('HIS 70B', 'LIT 61J') }), 'lower').status).toBe('unmet')
  })

  it('2-credit HIS courses do not count', () => {
    expect(find(run(harness, { terms: swap('HIS 185J', 'HIS 199F') }), 'upper').status).toBe('unmet')
  })

  it('two P/NP courses are fine; three are not', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HIS 10A': 'P', 'HIS 150A': 'P' } }))).toEqual([])
    const r = run(harness, { terms: base, grades: { 'HIS 10A': 'P', 'HIS 150A': 'P', 'HIS 160A': 'P' } })
    expect(find(r, 'pnp-limit').status).toBe('unmet')
  })

  it('a spare letter-graded course makes a P/NP overflow a check, not a failure', () => {
    const t = [...base, { term: '2288', courses: ['HIS 178A'] }]
    const r = run(harness, { terms: t, grades: { 'HIS 10A': 'P', 'HIS 150A': 'P', 'HIS 160A': 'P' } })
    expect(['met', 'cannot-check']).toContain(find(r, 'pnp-limit').status)
  })

  it('a failed course does not count', () => {
    expect(find(run(harness, { terms: base, grades: { 'HIS 172A': 'F' } }), 'upper').status).toBe('unmet')
  })
})
