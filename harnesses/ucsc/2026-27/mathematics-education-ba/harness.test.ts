import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'MATH 21'],
  ['2270', 'MATH 19B', 'MATH 23A', 'EDUC 50B'],
  ['2272', 'MATH 23B', 'STAT 5'],
  ['2278', 'MATH 100', 'MATH 110'],
  ['2280', 'MATH 128A', 'STAT 131', 'EDUC 100B'],
  ['2282', 'MATH 105A', 'MATH 111A'],
  ['2288', 'MATH 181', 'MATH 194'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('mathematics-education-ba 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('no MATH 24 / AM 20 requirement (unlike the other math majors)', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('EDUC 50A and EDUC 100A are accepted alternatives', () => {
    const t = swap('EDUC 50B', 'EDUC 50A').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'EDUC 100B' ? 'EDUC 100A' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('missing the Cal Teach 2 course fails', () => {
    expect(find(run(harness, { terms: swap('EDUC 100B') }), 'calteach2').status).toBe('unmet')
  })

  it('STAT 5 is required', () => {
    expect(find(run(harness, { terms: swap('STAT 5') }), 'stat5').status).toBe('unmet')
  })

  it('MATH 181 history of mathematics is required', () => {
    expect(find(run(harness, { terms: swap('MATH 181', 'MATH 115') }), 'ud-core').status).toBe('unmet')
  })

  it('algebra must be MATH 111A/111T (MATH 117 does not satisfy it here)', () => {
    expect(find(run(harness, { terms: swap('MATH 111A', 'MATH 117') }), 'algebra').status).toBe('unmet')
  })

  it('MATH 103A satisfies analysis', () => {
    expect(failing(run(harness, { terms: swap('MATH 105A', 'MATH 103A') }))).toEqual([])
  })

  it('DC / comprehensive need MATH 194 or 195', () => {
    const r = run(harness, { terms: swap('MATH 194') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('MATH 194', 'MATH 195') }))).toEqual([])
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms: base, grades: { 'EDUC 50B': 'P', 'STAT 131': 'P' } }))).toEqual([])
  })
})
