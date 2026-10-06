import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'CHEM 3A', 'MATH 19A', 'BIOL 20A'],
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B', 'BIOE 20B'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'STAT 5', 'BIOL 20L'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2280', 'CHEM 8B', 'CHEM 8M', 'PHYS 6B', 'PHYS 6M'],
  ['2282', 'PHYS 6C', 'PHYS 6N', 'BIOL 105'],
  ['2288', 'BIOC 100A', 'CHEM 163A', 'BIOL 101L'],
  ['2290', 'BIOC 100B', 'CHEM 163B', 'BIOL 115'],
  ['2292', 'BIOC 100C', 'CHEM 171'],
  ['2298', 'BIOC 110L'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('biochemistry-and-molecular-biology-bs 2025-26', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'dc').status).toBe('met')
  })

  it('C or better, letter grades', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOL 105': 'C-' } }), 'genetics').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'BIOC 110L': 'P' } }), 'exit-lab').status).toBe('unmet')
  })

  it('statistics: STAT 5, or STAT 7 with STAT 7L', () => {
    expect(find(run(harness, { terms: edit(base, 'STAT 5', 'STAT 7') }), 'statistics').status).toBe('unmet')
    expect(find(run(harness, { terms: [...edit(base, 'STAT 5', 'STAT 7'), { term: '2300', courses: ['STAT 7L'] }] }), 'statistics').status).toBe('met')
  })

  it('introductory biology lab: BIOL 20L or a CURE J course', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 20L', null) }), 'intro-bio-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 20L', 'CHEM 160J') }), 'intro-bio-lab').status).toBe('met')
  })

  it('upper-division lab after BIOC 100: one of the listed K/L courses', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', null) }), 'bmb-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', 'BIOL 122K') }), 'bmb-lab').status).toBe('met')
  })

  it('physical chemistry: CHEM pair or BIOC pair; a mix is cannot-check', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'CHEM 163A', 'BIOC 163A'), 'CHEM 163B', 'BIOC 163B') }), 'pchem').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'CHEM 163B', 'BIOC 163B') }), 'pchem').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'CHEM 163B', null) }), 'pchem').status).toBe('unmet')
  })

  it('elective: one from the list', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'CHEM 122') }), 'elective').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'STAT 131') }), 'elective').status).toBe('met')
  })

  it('senior exit lab is required; it also gives DC and comprehensive', () => {
    const r = run(harness, { terms: edit(base, 'BIOC 110L', null) })
    expect(find(r, 'exit-lab').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(failing(run(harness, { terms: edit(base, 'BIOC 110L', 'BIOL 186L') }))).toEqual([])
  })

  it('2025-26: CHEM 3 series needs CHEM 3BL and CHEM 3CL in every term (no fall-2026 rule)', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3BL', null) }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: BIOL 104B and BIOL 105B are not Senior Exit Labs', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOC 110L', 'BIOL 104B') }), 'exit-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOC 110L', 'BIOL 105B') }), 'exit-lab').status).toBe('unmet')
  })

  it('physics: one series with labs; mixed is cannot-check', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 6C', 'PHYS 5C') }), 'physics').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'PHYS 6L', null) }), 'physics').status).toBe('unmet')
  })

  // --- review 2026-10-06: adversarial records ---
  const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2300', courses: cs }]

  it('2025-26: no mixing note on the page; a mixed MATH 11/19 pair is cannot-check, not met', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calculus').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 19A', 'MATH 11A'), 'MATH 19B', 'MATH 11B') }), 'calculus').status).toBe('met')
  })

  it('review: a CURE J lab is not also the upper-division K/L lab, and an exit lab is not the BMB lab', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', 'CHEM 160L') }), 'bmb-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', 'CHEM 160J') }), 'bmb-lab').status).toBe('unmet')
  })

  it('review: two exit labs do not substitute for the elective', () => {
    expect(find(run(harness, { terms: add(edit(base, 'CHEM 171', null), 'CHEM 186L') }), 'elective').status).toBe('unmet')
  })

  it('review: no CHEM 8N honors substitute is stated on this page', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 8M', 'CHEM 8N') }), 'orgo').status).toBe('unmet')
  })

  it('review: P in a required course fails the letter-grade rule; C passes', () => {
    expect(failing(run(harness, { terms: base, grades: { 'BIOL 115': 'P' } }))).toEqual(['euk:unmet'])
    expect(failing(run(harness, { terms: base, grades: { 'BIOL 115': 'C' } }))).toEqual([])
  })

  it('review: exam credit (no term) counts as the course', () => {
    const t = edit(base, 'STAT 5', null)
    expect(failing(run(harness, { terms: t, completed: ['STAT 5'] }))).toEqual([])
  })

  it('review: empty plan', () => {
    const f = failing(run(harness, { terms: [], attested: [] }))
    expect(f).toEqual(expect.arrayContaining(['gen-chem:unmet', 'calculus:unmet', 'exit-lab:unmet', 'dc:unmet', 'comprehensive:unmet', 'elective:unmet']))
  })
})
