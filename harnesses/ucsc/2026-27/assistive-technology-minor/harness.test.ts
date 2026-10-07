import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CHEM 3A', 'BIOL 20A'],
  ['2270', 'MATH 19B', 'PHYS 5A', 'PHYS 5L', 'CSE 12'],
  ['2272', 'AM 10', 'PHYS 5C', 'PHYS 5N', 'BIOE 20B'],
  ['2278', 'AM 20', 'CSE 13S', 'CSE 100', 'CSE 100L'],
  ['2280', 'ECE 101', 'ECE 101L', 'METX 135', 'METX 135L'],
  ['2282', 'ECE 103', 'ECE 167'],
  ['2288', 'ECE 118', 'ECE 121'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('assistive-technology-minor 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('CHEM 1A (prior series) satisfies the chemistry requirement; CHEM 4A too', () => {
    expect(failing(run(harness, { terms: swap('CHEM 3A', ['CHEM 1A']) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CHEM 3A', ['CHEM 4A']) }))).toEqual([])
  })

  it('missing chemistry fails', () => {
    expect(failing(run(harness, { terms: swap('CHEM 3A', []) }))).toEqual(['chem:unmet'])
  })

  it('PHYS 15A / 15C substitute for PHYS 5A / 5C, but the labs are still required', () => {
    expect(failing(run(harness, { terms: swap('PHYS 5A', ['PHYS 15A']) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('PHYS 5C', ['PHYS 15C']) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('PHYS 5N', []) }))).toEqual(['phys5n:unmet'])
  })

  it('METX 135L is required along with METX 135', () => {
    expect(failing(run(harness, { terms: swap('METX 135L', []) }))).toEqual(['core-ud/METX135L:unmet'])
  })

  it('ECE 141 is an alternative to ECE 121; neither fails', () => {
    expect(failing(run(harness, { terms: swap('ECE 121', ['ECE 141']) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('ECE 121', []) }))).toEqual(['ud-choice:unmet'])
  })

  it('MATH 21 / MATH 24 and ECE 13 alternatives count', () => {
    let t = swap('AM 10', ['MATH 21'])
    t = t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'AM 20' ? 'MATH 24' : c === 'CSE 13S' ? 'ECE 13' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('P/NP is accepted for the minor', () => {
    expect(failing(run(harness, { terms: base, grades: { 'ECE 118': 'P', 'MATH 19A': 'P' } }))).toEqual([])
  })

  it('a failed course does not count', () => {
    expect(find(run(harness, { terms: base, grades: { 'ECE 167': 'F' } }), 'core-ud/ECE167').status).toBe('unmet')
  })

  it('review: CHEM 1A as no-term transfer credit counts; CHEM 3B does not', () => {
    expect(failing(run(harness, { terms: swap('CHEM 3A', []), completed: ['CHEM 1A'], entry: 'transfer' }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CHEM 3A', ['CHEM 3B']) }))).toEqual(['chem:unmet'])
  })

  it('review: ECE 141 cannot stand in for the required ECE 118; a lab without its lecture is not enough', () => {
    expect(failing(run(harness, { terms: swap('ECE 118', ['ECE 141']) }))).toEqual(['core-ud/ECE118:unmet'])
    expect(failing(run(harness, { terms: swap('METX 135', []) }))).toEqual(['core-ud/METX135:unmet'])
  })

  it('review: NP does not count; planned courses are in progress', () => {
    expect(failing(run(harness, { terms: base, grades: { 'BIOE 20B': 'NP' } }))).toEqual(['bio-cse/BIOE20B:unmet'])
    expect(run(harness, { terms: base, currentTerm: '2288' }).status).toBe('in-progress')
  })
})
