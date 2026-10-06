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

  it('graduate seminars do not count without petition (HISC 200+ outside 100–199)', () => {
    expect(find(run(harness, { terms: swap('HISC 199', 'HISC 203A') }), 'upper-five').status).toBe('unmet')
  })

  it('P counts; C counts; C- does not', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HISC 102': 'P', 'HISC 1': 'C' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'HISC 102': 'C-' } }), 'upper-five').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'HISC 1': 'D' } }), 'hisc1').status).toBe('unmet')
  })

  it('courses from other departments do not count', () => {
    expect(find(run(harness, { terms: swap('HISC 120', 'HIS 120') }), 'upper-five').status).toBe('unmet')
  })
})
