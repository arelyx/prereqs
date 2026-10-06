import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2298', courses: cs }]

const base = plan(
  ['2268', 'CHEM 3A', 'BIOL 20A', 'BME 5'],
  ['2270', 'STAT 7', 'STAT 7L', 'BME 80G'],
  ['2272', 'BME 80H'],
  ['2278', 'BME 105', 'BME 110'],
  ['2280', 'BME 160', 'BME 130'],
  ['2282', 'BME 132', 'SOCY 121'],
  ['2288', 'BME 185', 'BME 175'],
)

describe('biotechnology-ba 2026-27', () => {
  it('complete record (41 upper-division credits)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'ud-credits').progress?.have).toBe(41)
  })

  it('CSE 20 instead of BME 160 requires a fourth elective', () => {
    const t = edit(base, 'BME 160', 'CSE 20')
    const r = run(harness, { terms: t })
    expect(find(r, 'bme160').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: add(t, 'METX 100') }))).toEqual([])
  })

  it('three electives are required', () => {
    expect(find(run(harness, { terms: edit(base, 'SOCY 121', null) }), 'electives').status).toBe('unmet')
  })

  it('one upper-division BIOL course by petition', () => {
    const t = edit(base, 'SOCY 121', 'BIOL 110')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: [] }), 'electives').status).toBe('needs-attestation')
    // only one biology course may count
    const two = edit(t, 'BME 132', 'BIOL 115')
    expect(find(run(harness, { terms: two }), 'electives').status).toBe('unmet')
  })

  it('chemistry: CHEM 4A needs 4AL; transferred BIOL 20A waives chemistry', () => {
    const t = edit(base, 'CHEM 3A', 'CHEM 4A')
    expect(find(run(harness, { terms: t }), 'chem').status).toBe('unmet')
    const transfer = edit(edit(base, 'CHEM 3A', null), 'BIOL 20A', null)
    expect(find(run(harness, { terms: transfer, completed: ['BIOL 20A'] }), 'chem').status).toBe('met')
    // a UCSC BIOL 20A does not waive it
    expect(find(run(harness, { terms: edit(base, 'CHEM 3A', null) }), 'chem').status).toBe('unmet')
  })

  it('statistics: STAT 5, or STAT 131 substitute; STAT 7 needs its lab', () => {
    const noStat = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)
    expect(find(run(harness, { terms: add(noStat, 'STAT 5') }), 'stats').status).toBe('met')
    expect(find(run(harness, { terms: add(noStat, 'STAT 131') }), 'stats').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'stats').status).toBe('unmet')
  })

  it('biotechnology and society: BME 80G plus one of BME 18/80H/ECE 80B', () => {
    expect(find(run(harness, { terms: edit(base, 'BME 80H', null) }), 'society').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BME 80H', 'ECE 80B') }), 'society').status).toBe('met')
  })

  it('DC (BME 185) and comprehensive (BME 175) are required', () => {
    expect(find(run(harness, { terms: edit(base, 'BME 185', null) }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BME 175', null) }), 'comprehensive').status).toBe('unmet')
  })

  it('only listed courses are electives (BME 128 yes, BME 101 no)', () => {
    expect(failing(run(harness, { terms: edit(base, 'SOCY 121', 'BME 128') }))).toEqual([])
    expect(find(run(harness, { terms: edit(base, 'SOCY 121', 'BME 101') }), 'electives').status).toBe('unmet')
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'BME 130': 'P' } }), 'electives').status).toBe('unmet')
  })

  // review 2026-10-06: "CSE 20 has a test-out exam that will also be accepted."
  it('CSE 20 test-out replaces BME 160 and then needs a fourth elective', () => {
    const t = edit(base, 'BME 160', null)
    const r = run(harness, { terms: t })
    expect(find(r, 'bme160-testout').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: add(t, 'METX 100') }))).toEqual([])
    const no = run(harness, { terms: add(t, 'METX 100'), attested: [] })
    expect(find(no, 'bme160-or-testout').status).toBe('needs-attestation')
    // not asked when BME 160 is in the plan
    expect(() => find(run(harness, { terms: base, attested: [] }), 'bme160-or-testout')).toThrow()
  })

  it('a failed BME 160 with CSE 20 still needs four electives', () => {
    const r = run(harness, { terms: add(base, 'CSE 20'), grades: { 'BME 160': 'F' } })
    expect(find(r, 'bme160').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('BME 175 (comprehensive) and a retaken elective do not count as electives', () => {
    expect(find(run(harness, { terms: edit(base, 'SOCY 121', 'BME 175') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: add(edit(base, 'SOCY 121', null), 'BME 130') }), 'electives').status).toBe('unmet')
  })
})
