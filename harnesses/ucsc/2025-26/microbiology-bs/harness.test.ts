import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2025 (2025-26 catalog: CHEM 3BL/3CL always required;
// two electives).
const base = plan(
  ['2258', 'BIOL 20A', 'CHEM 3A', 'MATH 16A'],
  ['2260', 'BIOE 20B', 'CHEM 3B', 'CHEM 3BL', 'MATH 16B', 'BIOL 20L'],
  ['2262', 'BIOE 20C', 'CHEM 3C', 'CHEM 3CL', 'STAT 7', 'STAT 7L'],
  ['2268', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2270', 'CHEM 8B', 'PHYS 6B'],
  ['2272', 'BIOL 100', 'METX 100'],
  ['2278', 'METX 100L', 'BIOL 101L', 'BME 110'],
  ['2280', 'METX 140', 'METX 133'],
  ['2282', 'METX 150', 'BIOE 149'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('microbiology-bs 2025-26', () => {
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

  it('2025-26: CHEM 3BL and 3CL are required with CHEM 3B/3C whatever the term', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3BL', null) }), 'gen-chem').status).toBe('unmet')
    const late = base.map((q) => ({ ...q, term: String(Number(q.term) + 10) })) // fall 2026 start
    expect(find(run(harness, { terms: edit(edit(late, 'CHEM 3BL', null), 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2262', 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('calculus: unmixed series only; a mixed 11/19 pair is cannot-check, 16/19 mix is unmet', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 16A', 'MATH 19A'), 'MATH 16B', 'MATH 19B') }), 'calc-series').status).toBe('met')
    const mixed = run(harness, { terms: edit(edit(base, 'MATH 16A', 'MATH 19A'), 'MATH 16B', 'MATH 11B') })
    expect(find(mixed, 'calc').status).toBe('cannot-check')
    expect(mixed.status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'MATH 16B', 'MATH 19B') }), 'calc-series').status).toBe('unmet')
  })

  it('2025-26: two electives are needed; an off-list course does not count', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', null) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'METX 119') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'BME 160') }), 'electives').status).toBe('met')
  })

  it('2025-26: METX 108, METX 112 and METX 131 are not on the elective list', () => {
    for (const c of ['METX 108', 'METX 112', 'METX 131'])
      expect(find(run(harness, { terms: edit(base, 'BIOE 149', c) }), 'electives').status).toBe('unmet')
  })

  it('2025-26: METX 141 (and its current code METX 141L) is an elective', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'METX 141') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'METX 141L') }), 'electives').status).toBe('met')
  })

  it('2025-26: the two electives must total at least 9 credits (METX 135L alone is 3)', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'METX 135L') }), 'electives').status).not.toBe('met')
  })

  it('METX 135 + 135L count as one elective, not two', () => {
    const t = add(edit(base, 'BIOE 149', null), '2282', 'METX 135', 'METX 135L')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('met') // 133 + (135+135L)
    const one = add(edit(edit(base, 'BIOE 149', null), 'METX 133', null), '2282', 'METX 135', 'METX 135L')
    expect(find(run(harness, { terms: one }), 'electives').status).toBe('unmet') // only one course
  })

  it('a required course (BME 110) cannot double as an elective', () => {
    // BME 110 is not on the elective list; required courses are consumed by the core.
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'BIOL 100') }), 'electives').status).toBe('unmet')
  })

  it('missing PHYS 6L fails lower division (only PHYS 6L listed)', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 6L', 'PHYS 6M') }), 'ld-core').status).toBe('unmet')
  })

  it('2025-26: exam credit for CHEM 3B/3C with no term still needs the labs', () => {
    const t = ['CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'].reduce((x, c) => edit(x, c, null), base)
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3C'] }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'] }), 'gen-chem').status).toBe('met')
  })

  describe('review 2026-10-06 (adversarial)', () => {
    const noBio = edit(edit(edit(base, 'BIOL 20A', null), 'BIOE 20B', null), 'BIOL 20L', null)

    it('BIOL 20L waiver: transfer with term-less BIOL 20A + BIOE 20B and no 20L is cannot-check', () => {
      // "BIOL 20L is waived for students who have completed BIOL 20A and BIOE 20B from California community colleges."
      const r = run(harness, { terms: noBio, completed: ['BIOL 20A', 'BIOE 20B'], entry: 'transfer' })
      expect(find(r, 'ld-core/BIOL20L').status).toBe('cannot-check')
      expect(r.status).toBe('cannot-check')
      expect(failing(r)).toEqual(['ld-core/BIOL20L:cannot-check'])
    })

    it('BIOL 20L waiver does not apply to a frosh or to UCSC-term BIOL 20A/20B', () => {
      expect(find(run(harness, { terms: noBio, completed: ['BIOL 20A', 'BIOE 20B'], entry: 'frosh' }), 'ld-core/BIOL20L').status).toBe('unmet')
      expect(find(run(harness, { terms: edit(base, 'BIOL 20L', null), entry: 'transfer' }), 'ld-core/BIOL20L').status).toBe('unmet')
    })

    it('2025-26: CHEM 3C taken fall 2026 or later still needs CHEM 3CL', () => {
      const t = [
        ...plan(['2262', 'CHEM 3A'], ['2264', 'CHEM 3B', 'CHEM 3BL']),
        ...['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'].reduce((x, c) => edit(x, c, null), base),
        ...plan(['2290', 'CHEM 3C']),
      ]
      expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    })

    it('a P-graded elective does not count (letter grade policy)', () => {
      const r = run(harness, { terms: base, grades: { 'BIOE 149': 'P' } })
      expect(failing(r)).toEqual(['electives:unmet'])
    })

    it('METX 100L C- blames the core, DC and comprehensive only', () => {
      const r = run(harness, { terms: base, grades: { 'METX 100L': 'C-' } })
      expect(failing(r)).toEqual(['upper/METX100L:unmet', 'dc:unmet', 'comprehensive:unmet'])
    })

    it('term-less (transfer/exam) credit counts as a course in the plan', () => {
      expect(run(harness, { terms: edit(base, 'PHYS 6A', null), completed: ['PHYS 6A'] }).status).toBe('met')
    })

    it('planned courses show in-progress, not met', () => {
      const r = run(harness, { terms: base, currentTerm: '2280' })
      expect(r.status).toBe('in-progress')
      expect(find(r, 'electives').status).toBe('in-progress')
    })

    it('kitchen sink plan is met; empty plan is unmet everywhere', () => {
      const extra = ['METX 108', 'METX 135', 'METX 135L', 'METX 141L', 'BME 160', 'CHEM 4A', 'CHEM 4AL', 'STAT 5', 'MATH 11A', 'MATH 19B']
      expect(run(harness, { terms: [...base, { term: '2290', courses: extra }] }).status).toBe('met')
      expect(run(harness, { terms: [] }).status).toBe('unmet')
    })
  })
})
