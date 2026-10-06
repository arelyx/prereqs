import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 12'],
  ['2270', 'MATH 19B', 'PHYS 5A', 'PHYS 5L', 'CSE 13S'],
  ['2272', 'AM 10', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'AM 20', 'CSE 100', 'CSE 100L'],
  ['2280', 'ECE 101', 'ECE 101L', 'ECE 103'],
  ['2282', 'ECE 121', 'ECE 167'],
  ['2288', 'ECE 104'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('bioelectronics-and-biophotonics-minor 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('ECE 130 needs ECE 130L to complete the option', () => {
    expect(failing(run(harness, { terms: swap('ECE 104', ['ECE 130']) }))).toEqual(['bio-option:unmet'])
    expect(failing(run(harness, { terms: swap('ECE 104', ['ECE 130', 'ECE 130L']) }))).toEqual([])
  })

  it('BME 140 completes the option', () => {
    expect(failing(run(harness, { terms: swap('ECE 104', ['BME 140']) }))).toEqual([])
  })

  it('PHYS 15A / 15C substitute for 5A / 5C', () => {
    const t = swap('PHYS 5A', ['PHYS 15A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHYS 5C' ? 'PHYS 15C' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('ECE 121 is required (not an alternative here)', () => {
    expect(failing(run(harness, { terms: swap('ECE 121', []) }))).toEqual(['core-ud/ECE121:unmet'])
  })

  it('missing differential equations fails; MATH 24 counts', () => {
    expect(failing(run(harness, { terms: swap('AM 20', []) }))).toEqual(['ode:unmet'])
    expect(failing(run(harness, { terms: swap('AM 20', ['MATH 24']) }))).toEqual([])
  })

  it('P/NP accepted; NP is not', () => {
    expect(failing(run(harness, { terms: base, grades: { 'ECE 167': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'ECE 167': 'NP' } }), 'core-ud/ECE167').status).toBe('unmet')
  })

  it('review: ECE 130L alone, or graduate ECE 230 + 130L, does not complete the option; a failed ECE 104 does not count', () => {
    expect(failing(run(harness, { terms: swap('ECE 104', ['ECE 130L']) }))).toEqual(['bio-option:unmet'])
    expect(failing(run(harness, { terms: swap('ECE 104', ['ECE 230', 'ECE 130L']) }))).toEqual(['bio-option:unmet'])
    expect(failing(run(harness, { terms: base, grades: { 'ECE 104': 'F' } }))).toEqual(['bio-option:unmet'])
  })

  it('review: PHYS 15A still needs PHYS 5L; no-term transfer credit counts', () => {
    const t = swap('PHYS 5A', ['PHYS 15A']).map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'PHYS 5L') }))
    expect(failing(run(harness, { terms: t }))).toEqual(['phys5l:unmet'])
    expect(failing(run(harness, { terms: [], completed: base.flatMap((q) => q.courses), entry: 'transfer' }))).toEqual([])
  })
})
