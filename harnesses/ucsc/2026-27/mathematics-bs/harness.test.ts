import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'MATH 21'],
  ['2270', 'MATH 19B', 'MATH 23A'],
  ['2272', 'MATH 23B', 'MATH 24'],
  ['2278', 'MATH 100', 'MATH 105A'],
  ['2280', 'MATH 103A', 'MATH 117'],
  ['2282', 'MATH 111A', 'MATH 124'],
  ['2288', 'MATH 115', 'MATH 134', 'STAT 131'],
  ['2290', 'MATH 194'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('mathematics-bs 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('MATH 103A, 105A and 117 are all required (unlike the B.A.)', () => {
    expect(find(run(harness, { terms: swap('MATH 103A') }), 'ud-core').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 117', 'MATH 110') }), 'ud-core').status).toBe('unmet')
  })

  it('algebra must be MATH 111A or 111T; MATH 110 does not satisfy it', () => {
    expect(find(run(harness, { terms: swap('MATH 111A', 'MATH 110') }), 'algebra').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('MATH 111A', 'MATH 111T') }), 'algebra').status).toBe('met')
  })

  it('MATH 117 cannot serve both the core and an elective', () => {
    expect(find(run(harness, { terms: swap('MATH 134') }), 'electives').status).toBe('unmet')
  })

  it('a second geometry course counts as an elective', () => {
    expect(failing(run(harness, { terms: swap('MATH 134', 'MATH 128A') }))).toEqual([])
  })

  it('MATH 110 and MATH 111B are electives', () => {
    const t = swap('MATH 134', 'MATH 110').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 115' ? 'MATH 111B' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('at most two electives from other departments', () => {
    const t = swap('MATH 115', 'AM 114').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 134' ? 'BME 118' : c)) }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('a non-listed other-department course does not count', () => {
    expect(find(run(harness, { terms: swap('STAT 131', 'STAT 132') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('STAT 131', 'PHYS 116A') }), 'electives').status).toBe('unmet')
  })

  it('DC and comprehensive need MATH 194 or 195', () => {
    const r = run(harness, { terms: swap('MATH 194') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('MATH 194', 'MATH 195') }))).toEqual([])
  })

  it('MATH 20A/20B honors calculus and AM 30 + AM 100', () => {
    const t = swap('MATH 19A', 'MATH 20A').map((x) => ({
      ...x,
      courses: x.courses.flatMap((c) => (c === 'MATH 19B' ? ['MATH 20B'] : c === 'MATH 23A' ? ['AM 30'] : c === 'MATH 23B' ? ['AM 100'] : [c])),
    }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms: base, grades: { 'MATH 117': 'P' } }))).toEqual([])
  })

  it('MATH 111A and MATH 111T: credit for only one (the second is not an elective)', () => {
    expect(find(run(harness, { terms: swap('MATH 134', 'MATH 111T') }), 'electives').status).toBe('unmet')
  })
})
