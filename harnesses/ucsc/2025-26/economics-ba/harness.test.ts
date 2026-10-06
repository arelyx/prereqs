import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'ECON 1', 'AM 11A'],
  ['2270', 'ECON 2', 'AM 11B'],
  ['2272', 'STAT 17', 'STAT 17L'],
  ['2278', 'ECON 100A', 'ECON 113'],
  ['2280', 'ECON 100B', 'ECON 104'],
  ['2282', 'ECON 120', 'ECON 130', 'ECON 140'],
  ['2288', 'ECON 131', 'ECON 101'],
)
const swap = (from: string, to: string) =>
  base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))

describe('economics-ba 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('MATH 19A + AM 11B is a listed option, no petition needed', () => {
    const r = run(harness, { terms: swap('AM 11A', 'MATH 19A'), attested: [] })
    expect(find(r, 'math').status).toBe('met')
  })

  it('MATH 11A/11B/23A options need the Mathematics petition', () => {
    const t = swap('AM 11A', 'MATH 11A')
    const r = run(harness, { terms: t, attested: [] })
    expect(find(r, 'math-petition-path').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['math petition'] }), 'math-petition-path').status).toBe('met')
    // a plain package present alongside petition courses never asks for the petition
    const both = [...t, { term: '2290', courses: ['AM 11A'] }]
    expect(() => find(run(harness, { terms: both, attested: [] }), 'math-petition-path')).toThrow()
  })

  it('at least three General electives', () => {
    const r = run(harness, { terms: swap('ECON 140', 'ECON 133') })
    const n = find(r, 'electives')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/General Economics Electives: 2 of 3/)
  })

  it('no more than one Business Management elective', () => {
    const r = run(harness, { terms: swap('ECON 131', 'ECON 110') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('ECON 195 or ECON 199 may fill one elective, not two', () => {
    expect(find(run(harness, { terms: swap('ECON 131', 'ECON 199') }), 'electives').status).toBe('met')
    const two = swap('ECON 131', 'ECON 199').map((t) => ({ ...t, courses: t.courses.map((c) => (c === 'ECON 101' ? 'ECON 195' : c)) }))
    expect(find(run(harness, { terms: two }), 'electives').status).toBe('unmet')
  })

  it('ECON 193 never counts', () => {
    expect(find(run(harness, { terms: swap('ECON 131', 'ECON 193') }), 'electives').status).toBe('unmet')
  })

  it('cross-listed LGST 128 counts as ECON 128', () => {
    expect(find(run(harness, { terms: swap('ECON 140', 'LGST 128') }), 'electives').status).toBe('met')
  })

  it('comprehensive needs C or better; P counts', () => {
    const r = run(harness, { terms: base, grades: { 'ECON 113': 'C-' } })
    expect(find(r, 'econ113').status).toBe('met')
    expect(find(r, 'comp-113').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'ECON 113': 'P' } }), 'comprehensive').status).toBe('met')
  })

  it('DC is ECON 104 or ECON 197', () => {
    expect(find(run(harness, { terms: swap('ECON 104', 'ECON 197') }), 'dc').status).toBe('met')
    expect(find(run(harness, { terms: swap('ECON 104', 'ECON 190') }), 'dc').status).toBe('unmet')
  })

  it('2025-26: CRWN 152 is not a Business Management elective', () => {
    expect(find(run(harness, { terms: swap('ECON 101', 'CRWN 152') }), 'electives').status).toBe('unmet')
  })
})
