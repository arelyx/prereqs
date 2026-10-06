import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2026 (CHEM 3B/3C include lab).
const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 16A'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'MATH 16B', 'BIOL 20L'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'STAT 7', 'STAT 7L'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2280', 'CHEM 8B', 'PHYS 6B'],
  ['2282', 'BIOL 100', 'METX 100'],
  ['2288', 'METX 100L', 'BIOL 101L', 'BME 110'],
  ['2290', 'METX 140', 'METX 133'],
  ['2292', 'METX 150', 'BIOE 149'],
  ['2298', 'CHEM 171'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('microbiology-bs 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('missing METX 100L fails the core, DC and comprehensive', () => {
    const r = run(harness, { terms: edit(base, 'METX 100L', null) })
    expect(find(r, 'upper').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('C or better is required (C- fails), letter grade required (P fails)', () => {
    expect(find(run(harness, { terms: base, grades: { 'METX 140': 'C-' } }), 'upper').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'METX 140': 'C' } }), 'upper').status).toBe('met')
    expect(find(run(harness, { terms: base, grades: { 'PHYS 6B': 'P' } }), 'ld-core').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CHEM 3C': 'D' } }), 'gen-chem').status).toBe('unmet')
  })

  it('STAT 5 may replace STAT 7/7L; STAT 7 without 7L does not', () => {
    const t = edit(edit(base, 'STAT 7', 'STAT 5'), 'STAT 7L', null)
    expect(run(harness, { terms: t }).status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'stats').status).toBe('unmet')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(early, '2262', 'CHEM 3BL', 'CHEM 3CL') }), 'gen-chem').status).toBe('met')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2272', 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('calculus: unmixed series only; a mixed 11/19 pair is cannot-check, 16/19 mix is unmet', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 16A', 'MATH 19A'), 'MATH 16B', 'MATH 19B') }), 'calc-series').status).toBe('met')
    const mixed = run(harness, { terms: edit(edit(base, 'MATH 16A', 'MATH 19A'), 'MATH 16B', 'MATH 11B') })
    expect(find(mixed, 'calc').status).toBe('cannot-check')
    expect(mixed.status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'MATH 16B', 'MATH 19B') }), 'calc-series').status).toBe('unmet')
  })

  it('electives: three needed from the list; an off-list course does not count', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', null) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'METX 119') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'BME 160') }), 'electives').status).toBe('met')
  })

  it('METX 135 + 135L count as one elective, not two', () => {
    const t = add(edit(base, 'CHEM 171', null), '2298', 'METX 135', 'METX 135L')
    const r = run(harness, { terms: t })
    expect(find(r, 'electives').status).toBe('met') // 133 + 149 + (135+135L)
    const two = add(edit(edit(base, 'CHEM 171', null), 'BIOE 149', null), '2298', 'METX 135', 'METX 135L')
    expect(find(run(harness, { terms: two }), 'electives').status).toBe('unmet') // only two courses
  })

  it('a required course (BME 110) cannot double as an elective', () => {
    // BME 110 is not on the elective list; required courses are consumed by the core.
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'BIOL 100') }), 'electives').status).toBe('unmet')
  })

  it('missing PHYS 6L fails lower division (only PHYS 6L listed)', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 6L', 'PHYS 6M') }), 'ld-core').status).toBe('unmet')
  })

  it('exam credit for CHEM 3B/3C with no term is cannot-check without the labs', () => {
    const t = edit(edit(base, 'CHEM 3B', null), 'CHEM 3C', null)
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3C'] }), 'gen-chem').status).toBe('cannot-check')
  })

  it('METX 141L (a stand-alone lab on the list) counts as an elective', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'METX 141L') }), 'electives').status).toBe('met')
  })
})
