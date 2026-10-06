import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'AM 10'],
  ['2270', 'MATH 19B', 'AM 20'],
  ['2272', 'AM 30', 'AM 100'],
  ['2278', 'AM 114', 'AM 147'],
  ['2280', 'AM 112', 'AM 129'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('applied-mathematics-minor 2026-27', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('mixed AM 10 + MATH 24 and MATH 21 + AM 20 combinations are accepted', () => {
    expect(find(run(harness, { terms: swap('AM 20', 'MATH 24') }), 'linalg-ode').status).toBe('met')
    expect(find(run(harness, { terms: swap('AM 10', 'MATH 21') }), 'linalg-ode').status).toBe('met')
  })

  it('PHYS 116A alone replaces the linear algebra + ODE sequence', () => {
    const t = swap('AM 10', 'PHYS 116A').map((x) => ({ ...x, courses: x.courses.filter((c) => c !== 'AM 20') }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('linear algebra without ODE fails', () => {
    expect(find(run(harness, { terms: swap('AM 20') }), 'linalg-ode').status).toBe('unmet')
  })

  it('MATH 23A without 23B fails the multivariable part', () => {
    expect(find(run(harness, { terms: swap('AM 30', 'MATH 23A') }), 'multivar').status).toBe('unmet')
  })

  it('category alternatives: PHYS 115 numerics, MATH 107 PDE', () => {
    const t = swap('AM 147', 'PHYS 115').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'AM 112' ? 'MATH 107' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('elective: AM 198 and AM 211 do not count; a graduate AM course or a listed course does', () => {
    expect(find(run(harness, { terms: swap('AM 129', 'AM 198') }), 'elective').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('AM 129', 'AM 211') }), 'elective').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('AM 129', 'AM 213A') }), 'elective').status).toBe('met')
    expect(find(run(harness, { terms: swap('AM 129', 'STAT 131') }), 'elective').status).toBe('met')
  })

  it('an extra numerics course (MATH 148) is not an elective', () => {
    expect(find(run(harness, { terms: swap('AM 129', 'MATH 148') }), 'elective').status).toBe('unmet')
  })

  it('a category course cannot double as the elective', () => {
    expect(find(run(harness, { terms: swap('AM 129') }), 'elective').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'AM 100': 'P' } }))).toEqual([])
  })
})
