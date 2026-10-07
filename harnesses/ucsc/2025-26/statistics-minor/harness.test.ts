import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'STAT 5', 'CSE 20'],
  ['2270', 'MATH 19B', 'MATH 21'],
  ['2272', 'MATH 22'],
  ['2278', 'STAT 131', 'AM 147'],
  ['2280', 'STAT 132', 'STAT 108'],
  ['2282', 'ECON 113'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('statistics-minor 2025-26', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('AM 11A + 11B or MATH 11A + 11B calculus is accepted; mixing sequences is not', () => {
    const t = swap('MATH 19A', 'AM 11A').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 19B' ? 'AM 11B' : c)) }))
    expect(find(run(harness, { terms: t }), 'calc').status).toBe('met')
    expect(find(run(harness, { terms: swap('MATH 19B', 'MATH 11B') }), 'calc').status).toBe('unmet')
  })

  it('STAT 7 needs its lab STAT 7L in this category', () => {
    expect(find(run(harness, { terms: swap('STAT 5', 'STAT 7') }), 'concepts').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('STAT 5', 'STAT 7', 'STAT 7L') }), 'concepts').status).toBe('met')
  })

  it('MATH 23A alone is not multivariate calculus; 23A + 23B or AM 30 is', () => {
    expect(find(run(harness, { terms: swap('MATH 22', 'MATH 23A') }), 'multivar').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 22', 'MATH 23A', 'MATH 23B') }), 'multivar').status).toBe('met')
    expect(find(run(harness, { terms: swap('MATH 22', 'AM 30') }), 'multivar').status).toBe('met')
  })

  it('STAT 132 inference is required', () => {
    expect(find(run(harness, { terms: swap('STAT 132') }), 'inference').status).toBe('unmet')
  })

  it('STAT 203 and CSE 107 are probability alternatives', () => {
    expect(failing(run(harness, { terms: swap('STAT 131', 'CSE 107') }))).toEqual([])
    expect(failing(run(harness, { terms: swap('STAT 131', 'STAT 203') }))).toEqual([])
  })

  it('electives must be on the list', () => {
    expect(find(run(harness, { terms: swap('ECON 113', 'ECON 100A') }), 'electives').status).toBe('unmet')
  })

  it('STAT 205 (recommended, but not listed) is not called unmet', () => {
    expect(find(run(harness, { terms: swap('ECON 113', 'STAT 205') }), 'electives').status).toBe('cannot-check')
  })

  it('PHYS 116A for linear algebra and BME 160 for programming', () => {
    const t = swap('MATH 21', 'PHYS 116A').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'CSE 20' ? 'BME 160' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'STAT 132': 'P' } }))).toEqual([])
  })

  it('programming: CSE 20 test-out exam is an attestation alternative', () => {
    expect(find(run(harness, { terms: swap('CSE 20'), attested: [] }), 'programming').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap('CSE 20'), attested: ['CSE 20 test-out'] }), 'programming').status).toBe('met')
  })

  it('review: the test-out is offered only when CSE 20 is absent; a failed CSE 20 stays unmet', () => {
    const r = run(harness, { terms: base, grades: { 'CSE 20': 'F' } })
    expect(find(r, 'programming').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 20') }), 'programming').detail).toContain('test-out')
  })

  it('review: STAT 5 taken after STAT 7 earns no credit, so it does not fill statistical concepts', () => {
    // STAT 5: "Students cannot receive credit for this course if they have already received credit for STAT 7 or STAT 17."
    const t = [{ term: '2266', courses: ['STAT 7'] }, ...base]
    expect(find(run(harness, { terms: t }), 'concepts').status).toBe('unmet')
    expect(find(run(harness, { terms: [{ term: '2266', courses: ['STAT 7', 'STAT 7L'] }, ...base] }), 'concepts').status).toBe('met')
  })

  it('review: a lab alone or STAT 17 without STAT 17L is not statistical concepts', () => {
    expect(find(run(harness, { terms: swap('STAT 5', 'STAT 17') }), 'concepts').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('STAT 5', 'STAT 17L') }), 'concepts').status).toBe('unmet')
  })

  it('review: a probability course does not double as an elective', () => {
    expect(find(run(harness, { terms: swap('ECON 113', 'CSE 107') }), 'electives').status).toBe('unmet')
  })
})
