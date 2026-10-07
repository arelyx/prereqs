import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'MATH 19B', 'BME 80G', 'STAT 7', 'STAT 7L'],
  ['2278', 'BME 105', 'BME 160'],
  ['2280', 'BME 163', 'BME 110'],
  ['2282', 'BME 130', 'BME 132'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2288', courses: cs }]

describe('bioinformatics-minor 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    // 5 + 6 + 5 + 5 + 5 + 5 = 31 upper-division credits
    expect(find(r, 'ud-credits').progress?.have).toBe(31)
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

  it('STAT 7 needs STAT 7L; STAT 131 alone works', () => {
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'stats').status).toBe('unmet')
    const s131 = edit(edit(base, 'STAT 7L', null), 'STAT 7', 'STAT 131')
    expect(failing(run(harness, { terms: s131 }))).toEqual([])
  })

  it('CSE 20 may replace BME 160', () => {
    const t = edit(base, 'BME 160', 'CSE 20')
    const r = run(harness, { terms: t })
    expect(find(r, 'bme160').status).toBe('met')
    // genetics 5 + BME 163 5 + BME 110 5 + two electives 10 = 25: still enough
    expect(find(r, 'ud-credits').status).toBe('met')
  })

  it('CSE 20 instead of BME 160 plus a 3-credit elective falls short of 25 credits', () => {
    const t = edit(edit(base, 'BME 160', 'CSE 20'), 'BME 132', 'BME 273')
    const r = run(harness, { terms: t })
    expect(find(r, 'electives').status).toBe('met')
    expect(find(r, 'ud-credits').status).toBe('unmet')
    // a third elective fixes it
    expect(find(run(harness, { terms: add(t, 'BME 140') }), 'ud-credits').status).toBe('met')
  })

  it('two electives are required', () => {
    const r = run(harness, { terms: edit(base, 'BME 132', null) })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('genetics alternatives: BIOL 105 or METX 140; BIOL 105 is not an elective', () => {
    expect(failing(run(harness, { terms: edit(base, 'BME 105', 'METX 140') }))).toEqual([])
    const r = run(harness, { terms: edit(base, 'BME 132', 'BIOL 105') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('BME 80G is required', () => {
    expect(find(run(harness, { terms: edit(base, 'BME 80G', null) }), 'bioethics').status).toBe('unmet')
  })

  it('graduate electives count', () => {
    const t = edit(edit(base, 'BME 130', 'BME 205'), 'BME 132', 'BME 230A')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  // review 2026-10-06: "CSE 20 has a test-out exam that will also be accepted."
  it('CSE 20 test-out: attestation offered only when neither BME 160 nor CSE 20 is in the plan', () => {
    const t = edit(add(base, 'BME 140'), 'BME 160', null)
    const yes = run(harness, { terms: t })
    expect(find(yes, 'bme160-testout').status).toBe('met')
    expect(failing(yes)).toEqual([])
    const no = run(harness, { terms: t, attested: [] })
    expect(find(no, 'bme160-or-testout').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['Passed the CSE 20 test-out'] }), 'bme160-testout').status).toBe('met')
    // with BME 160 present the test-out is not asked
    expect(() => find(run(harness, { terms: base, attested: [] }), 'bme160-or-testout')).toThrow()
  })

  it('a retaken elective counts once', () => {
    const r = run(harness, { terms: add(edit(base, 'BME 132', null), 'BME 130') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('cross-listed PHIL 80G and transfer BIOL 20A count', () => {
    const t = edit(edit(base, 'BME 80G', 'PHIL 80G'), 'BIOL 20A', null)
    expect(failing(run(harness, { terms: t, completed: ['BIOL 20A'] }))).toEqual([])
  })
})
