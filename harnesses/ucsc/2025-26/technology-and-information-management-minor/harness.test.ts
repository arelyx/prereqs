import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 11A', 'CSE 20'],
  ['2270', 'MATH 11B', 'TIM 50'],
  ['2272', 'TIM 58'],
  ['2278', 'STAT 131', 'CSE 150'],
  ['2280', 'ECON 100A', 'TIM 172A'],
  ['2282', 'TIM 175'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('technology-and-information-management-minor 2025-26', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('mixed calculus courses are fine (each slot is its own list)', () => {
    expect(failing(run(harness, { terms: swap('MATH 11B', 'AM 11B') }))).toEqual([])
  })

  it('TIM 80C is the alternative to TIM 58', () => {
    expect(failing(run(harness, { terms: swap('TIM 58', 'TIM 80C') }))).toEqual([])
    expect(find(run(harness, { terms: swap('TIM 58') }), 'tim58-80c').status).toBe('unmet')
  })

  it('four electives from the list', () => {
    expect(find(run(harness, { terms: swap('TIM 175') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('TIM 175', 'ECON 101') }), 'electives').status).toBe('unmet')
  })

  it('ECON 100A and ECON 100M count as one elective; CSE 180 and 182 likewise', () => {
    expect(find(run(harness, { terms: swap('TIM 175', 'ECON 100M') }), 'electives').status).toBe('unmet')
    const t = swap('TIM 175', 'CSE 180').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'TIM 172A' ? 'CSE 182' : c)) }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('TIM 175', 'ECON 100N') }), 'electives').status).toBe('met')
  })

  it('upper-division math: ECON 113 or CSE 107 also work', () => {
    expect(failing(run(harness, { terms: swap('STAT 131', 'ECON 113') }))).toEqual([])
    expect(find(run(harness, { terms: swap('STAT 131') }), 'ud-math').status).toBe('unmet')
  })

  it('CSE 20 test-out is an attestation alternative to CSE 20/30', () => {
    expect(find(run(harness, { terms: swap('CSE 20'), attested: [] }), 'programming').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap('CSE 20'), attested: ['CSE 20 test out'] }), 'programming').status).toBe('met')
    expect(find(run(harness, { terms: swap('CSE 20', 'CSE 30'), attested: [] }), 'programming').status).toBe('met')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'TIM 50': 'P', 'CSE 150': 'P' } }))).toEqual([])
  })

  it('review: a failed CSE 20 is not rescued by the test-out attestation', () => {
    expect(find(run(harness, { terms: base, grades: { 'CSE 20': 'F' } }), 'programming').status).toBe('unmet')
  })

  it('review: mixed calculus AM 11A + MATH 19B is fine (two independent one-of lists)', () => {
    const t = swap('MATH 11A', 'AM 11A').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 11B' ? 'MATH 19B' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
