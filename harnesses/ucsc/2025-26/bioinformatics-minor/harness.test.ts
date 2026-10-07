import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'MATH 19B', 'BME 80G', 'STAT 131'],
  ['2278', 'BME 105', 'BME 160'],
  ['2280', 'BME 163', 'BME 110'],
  ['2282', 'BME 130'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2288', courses: cs }]

describe('bioinformatics-minor 2025-26', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('CHEM 4A needs CHEM 4AL', () => {
    const t = edit(base, 'CHEM 3A', 'CHEM 4A')
    expect(find(run(harness, { terms: t }), 'chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'CHEM 4AL') }), 'chem').status).toBe('met')
  })

  it('calculus pairs cannot be mixed', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calc').status).toBe('unmet')
    const honors = edit(edit(base, 'MATH 19A', 'MATH 20A'), 'MATH 19B', 'MATH 20B')
    expect(find(run(harness, { terms: honors }), 'calc').status).toBe('met')
  })

  it('2025-26: statistics is STAT 131 only (STAT 7 + 7L does not count)', () => {
    const t = edit(base, 'STAT 131', 'STAT 7')
    expect(find(run(harness, { terms: add(t, 'STAT 7L') }), 'stats').status).toBe('unmet')
  })

  it('2025-26: CSE 20 does not replace BME 160', () => {
    const r = run(harness, { terms: edit(base, 'BME 160', 'CSE 20') })
    expect(find(r, 'bme160').status).toBe('unmet')
  })

  it('2025-26: one elective suffices (no 25-credit rule)', () => {
    expect(run(harness, { terms: base }).status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BME 130', null) }), 'electives').status).toBe('unmet')
  })

  it('2025-26: BME 140 / graduate courses are not on the elective list', () => {
    expect(find(run(harness, { terms: edit(base, 'BME 130', 'BME 140') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BME 130', 'BME 205') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BME 130', 'BME 122H') }), 'electives').status).toBe('met')
  })

  it('genetics alternatives: BIOL 105 or METX 140; BIOL 105 is not an elective', () => {
    expect(failing(run(harness, { terms: edit(base, 'BME 105', 'METX 140') }))).toEqual([])
    const r = run(harness, { terms: edit(base, 'BME 130', 'BIOL 105') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('BME 80G is required', () => {
    expect(find(run(harness, { terms: edit(base, 'BME 80G', null) }), 'bioethics').status).toBe('unmet')
  })

  it('cross-listed PHIL 80G and transfer BIOL 20A count', () => {
    const t = edit(edit(base, 'BME 80G', 'PHIL 80G'), 'BIOL 20A', null)
    expect(failing(run(harness, { terms: t, completed: ['BIOL 20A'] }))).toEqual([])
  })
})
