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

  it('review: STAT 5 taken after STAT 7 earns no catalog credit and does not fill the STAT 5 requirement', () => {
    const t = [{ term: '2266', courses: ['STAT 7'] }, ...base]
    expect(find(run(harness, { terms: t }), 'stat5').status).toBe('unmet')
    // STAT 7 alone is not STAT 5 either
    expect(find(run(harness, { terms: swap('STAT 5', 'STAT 7') }), 'stat5').status).toBe('unmet')
    // STAT 7 taken later does not void the earlier STAT 5
    expect(failing(run(harness, { terms: [...base, { term: '2290', courses: ['STAT 7'] }] }))).toEqual([])
  })

  it('review: AM 30 + AM 100 is the alternative multivariable package; a mixed pair is not', () => {
    const am = base.map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 23A' ? 'AM 30' : c === 'MATH 23B' ? 'AM 100' : c)) }))
    expect(failing(run(harness, { terms: am }))).toEqual([])
    expect(find(run(harness, { terms: swap('MATH 23B', 'AM 100') }), 'multivar').status).toBe('unmet')
  })

  it('review: two Cal Teach 1 courses do not stand in for Cal Teach 2', () => {
    expect(find(run(harness, { terms: swap('EDUC 100B', 'EDUC 50A') }), 'calteach2').status).toBe('unmet')
  })

  it('review: exam/transfer credit with no term counts', () => {
    const r = run(harness, { terms: base.slice(3), completed: ['MATH 19A', 'MATH 21', 'MATH 19B', 'MATH 23A', 'EDUC 50B', 'MATH 23B', 'STAT 5'], entry: 'transfer' })
    expect(failing(r)).toEqual([])
  })
})
