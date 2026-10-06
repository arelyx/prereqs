import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'ECON 1', 'AM 11A'],
  ['2270', 'ECON 2', 'AM 11B'],
  ['2272', 'STAT 17', 'STAT 17L'],
  ['2278', 'ECON 100A', 'ECON 113'],
  ['2280', 'ECON 100B', 'ECON 120'],
  ['2282', 'ECON 130', 'ECON 136'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))

describe('economics-minor 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('P/NP is allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'ECON 100A': 'P', 'ECON 120': 'P' } }))).toEqual([])
  })

  it('MATH 11A + 11B + 22 is a plain option for the minor (no petition note)', () => {
    const t = swap('AM 11A', 'MATH 11A').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'AM 11B' ? 'MATH 11B' : c)) }))
    t.push({ term: '2284', courses: ['MATH 22'] })
    expect(find(run(harness, { terms: t, attested: [] }), 'math').status).toBe('met')
  })

  it('ECON 104 is excluded from the electives', () => {
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 104') }), 'electives').status).toBe('unmet')
  })

  it('electives must be ECON 100-189: ECON 195/199 and 190+ do not count', () => {
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 199') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 190') }), 'electives').status).toBe('unmet')
  })

  it('no course satisfies two requirements: ECON 113 is not also an elective', () => {
    // drop an elective: the core courses cannot fill it
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'ECON 136') }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('ECON 100M alongside ECON 100A is not an extra elective (no credit for both)', () => {
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 100M') }), 'electives').status).toBe('unmet')
  })

  it('cross-listed LGST 128 counts as ECON 128', () => {
    expect(find(run(harness, { terms: swap('ECON 136', 'LGST 128') }), 'electives').status).toBe('met')
  })

  it('STAT 17 needs STAT 17L', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'STAT 17L') }))
    expect(find(run(harness, { terms: t }), 'stats').status).toBe('unmet')
  })

  it('ECON 100N may replace ECON 100B', () => {
    expect(failing(run(harness, { terms: swap('ECON 100B', 'ECON 100N') }))).toEqual([])
  })
})
