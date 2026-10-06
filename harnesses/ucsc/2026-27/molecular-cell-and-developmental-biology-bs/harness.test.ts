import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2026 (CHEM 3B/3C include lab).
const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'MATH 19B', 'BIOL 20L'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'STAT 7', 'STAT 7L'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2280', 'CHEM 8B', 'PHYS 6B'],
  ['2282', 'PHYS 6C', 'BIOL 100'],
  ['2288', 'BIOL 101', 'BIOL 101L', 'BIOL 105'],
  ['2290', 'BIOL 110', 'BIOL 120', 'BME 110'],
  ['2292', 'BIOL 112', 'BIOE 109'],
  ['2298', 'BIOL 105L'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('molecular-cell-and-developmental-biology-bs 2026-27', () => {
  it('complete record (BIOL 105L is the lab elective, DC and comprehensive)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('BIOE 20C is required', () => {
    expect(run(harness, { terms: edit(base, 'BIOE 20C', null) }).status).toBe('unmet')
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

  it('MATH 11/19 transition accepted; MATH 16 mixing not', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calc').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 16B') }), 'calc').status).toBe('unmet')
  })

  it('BIOL 110 is a core course here', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', null) }), 'ud-core').status).toBe('unmet')
  })

  it('developmental and bioinformatics slots accept their alternatives only', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 120', 'BME 178') }), 'development').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOL 120', 'BIOL 125') }), 'development').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BME 110', 'BIOL 104L') }), 'bioinformatics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BME 110', null) }), 'bioinformatics').status).toBe('unmet')
  })

  it('at least one of the two electives must be BIOL', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 112', 'BME 130') })
    expect(find(r, 'electives-two').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 109', 'BIOL 124') }), 'electives-two').status).toBe('met')
  })

  it('one course cannot fill both the bioinformatics slot and an elective', () => {
    // BME 110 can only fill the bioinformatics slot, not also an elective.
    const r = run(harness, { terms: edit(base, 'BIOE 109', 'BME 110') })
    expect(find(r, 'electives-two').status).toBe('unmet')
  })

  it('the lab elective is required and comes from its own list; it gives DC and comprehensive', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 105L', null) })
    expect(find(r, 'elective-lab').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    // BIOL 102L is a first-lab course only
    expect(find(run(harness, { terms: edit(base, 'BIOL 105L', 'BIOL 102L') }), 'elective-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 105L', 'CHEM 161L') }), 'dc').status).toBe('met')
  })

  it('first lab: BIOL 101L or alternatives', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', 'CHEM 160K') }), 'lab1').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', null) }), 'lab1').status).toBe('unmet')
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOL 112': 'P' } }), 'electives-two').status).toBe('unmet')
  })

  it('STAT 5 before UCSC + advisor waiver replaces STAT 7/7L', () => {
    const t = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)
    expect(find(run(harness, { terms: t }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['STAT 5'], attested: [] }), 'stats').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, completed: ['STAT 5'] }), 'stats').status).toBe('met')
  })
  it('BIOL 20L: required, but cannot-check for a transfer with term-less BIOL 20A and BIOE 20B', () => {
    const no20l = edit(base, 'BIOL 20L', null)
    expect(find(run(harness, { terms: no20l }), 'bio-chem-core').status).toBe('unmet')
    expect(find(run(harness, { terms: no20l, entry: 'transfer' }), 'bio-chem-core').status).toBe('unmet') // 20A/20B taken at UCSC
    const cc = edit(edit(no20l, 'BIOL 20A', null), 'BIOE 20B', null)
    const r = run(harness, { terms: cc, completed: ['BIOL 20A', 'BIOE 20B'], entry: 'transfer' })
    expect(find(r, 'bio-chem-core').status).toBe('cannot-check')
    expect(find(run(harness, { terms: cc, completed: ['BIOL 20A', 'BIOE 20B'] }), 'bio-chem-core').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'BIOL 20L': 'P' } }), 'bio-chem-core').status).toBe('unmet')
  })

  it('BIOL 120 fills the developmental slot while BIOL 120L is the lab elective', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 105L', 'BIOL 120L') })
    expect(failing(r)).toEqual([])
  })
})
