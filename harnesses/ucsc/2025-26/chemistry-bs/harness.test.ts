import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const lower = plan(
  ['2268', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'MATH 22'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2280', 'CHEM 8B', 'CHEM 8M', 'PHYS 6B', 'PHYS 6M'],
  ['2282', 'PHYS 6C', 'PHYS 6N', 'MATH 21'],
)
const general = [
  ...lower,
  ...plan(
    ['2288', 'CHEM 110', 'CHEM 110L', 'CHEM 163A'],
    ['2290', 'CHEM 151A', 'CHEM 151L', 'CHEM 163B'],
    ['2292', 'CHEM 103', 'CHEM 163C', 'CHEM 164'],
    ['2298', 'CHEM 122', 'CHEM 146A'],
    ['2300', 'CHEM 143'],
  ),
]
const bioc = [
  ...lower.map((q) => (q.term === '2282' ? { ...q, courses: [...q.courses, 'BIOL 20A', 'BIOE 20B'] } : q)),
  ...plan(
    ['2288', 'CHEM 110', 'CHEM 110L', 'CHEM 163A', 'BIOC 100A'],
    ['2290', 'CHEM 151A', 'CHEM 151L', 'CHEM 163B', 'BIOC 100B'],
    ['2292', 'BIOC 100C', 'CHEM 163C'],
    ['2298', 'BIOC 110L'],
  ),
]
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2302', courses: cs }]
const bc = { concentration: 'Biochemistry Concentration' }

describe('chemistry-bs 2025-26', () => {
  it('complete general record', () => {
    expect(failing(run(harness, { terms: general }))).toEqual([])
  })

  it('complete biochemistry concentration record (no electives, no CHEM 164)', () => {
    expect(failing(run(harness, { terms: bioc, choices: bc }))).toEqual([])
  })

  it('C or better, letter grade', () => {
    expect(find(run(harness, { terms: general, grades: { 'CHEM 110': 'C-' } }), 'chem110').status).toBe('unmet')
    expect(find(run(harness, { terms: general, grades: { 'CHEM 110': 'C' } }), 'chem110').status).toBe('met')
    expect(find(run(harness, { terms: general, grades: { 'MATH 21': 'P' } }), 'adv-math').status).toBe('unmet')
  })

  it('2025-26: CHEM 3 series needs CHEM 3BL and CHEM 3CL in every term (no fall-2026 rule)', () => {
    expect(find(run(harness, { terms: edit(general, 'CHEM 3BL', null) }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(bioc, 'CHEM 3CL', null), choices: bc }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: general B.S. needs one laboratory course (CHEM 146A/B/C, 160L, 161L, 186L; not CHEM 124)', () => {
    expect(find(run(harness, { terms: edit(general, 'CHEM 146A', null) }), 'adv-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(general, 'CHEM 146A', 'CHEM 186L') }), 'adv-lab').status).toBe('met')
    const r = run(harness, { terms: edit(general, 'CHEM 146A', 'CHEM 124') })
    expect(find(r, 'adv-lab').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
  })

  it('2025-26: concentration needs BIOC 110L, CHEM 160L, 161L or 186L with BIOC 100A–C', () => {
    expect(find(run(harness, { terms: edit(bioc, 'BIOC 110L', null), choices: bc }), 'biochem-lab').status).toBe('unmet')
    const r = run(harness, { terms: edit(bioc, 'BIOC 110L', 'CHEM 146A'), choices: bc })
    expect(find(r, 'biochem-lab').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
    expect(failing(run(harness, { terms: edit(bioc, 'BIOC 110L', 'CHEM 160L'), choices: bc }))).toEqual([])
  })

  it('2025-26: METX 102 is an elective; PHYS 161 is not', () => {
    expect(find(run(harness, { terms: edit(general, 'CHEM 143', 'METX 102') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(general, 'CHEM 143', 'PHYS 161') }), 'electives').status).toBe('unmet')
  })

  it('CHEM 4 series with both labs', () => {
    const t = edit(edit(edit(general, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4AL'), 'CHEM 3C', 'CHEM 4B')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('multivariable calculus: MATH 22, MATH 23A+23B, or AM 30', () => {
    expect(find(run(harness, { terms: edit(general, 'MATH 22', 'AM 30') }), 'multivariable').status).toBe('met')
    expect(find(run(harness, { terms: edit(general, 'MATH 22', 'MATH 23A') }), 'multivariable').status).toBe('unmet')
  })

  it('advanced mathematics: AM 10, MATH 21 or MATH 24', () => {
    expect(find(run(harness, { terms: edit(general, 'MATH 21', 'MATH 24') }), 'adv-math').status).toBe('met')
    expect(find(run(harness, { terms: edit(general, 'MATH 21', null) }), 'adv-math').status).toBe('unmet')
  })

  it('2025-26: MATH 19A then 11B (the page example) is met; MATH 11A + 19B defers to the external policy', () => {
    // "(for example, a student can take and complete MATH 19A and then take and complete MATH 11B) but must follow the Mathematics Department’s Calculus Series Transition Policy"
    expect(find(run(harness, { terms: edit(general, 'MATH 19B', 'MATH 11B') }), 'calculus').status).toBe('met')
    expect(find(run(harness, { terms: edit(general, 'MATH 19A', 'MATH 11A') }), 'calculus').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(bioc, 'MATH 19A', 'MATH 11A'), choices: bc }), 'calculus').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(general, 'MATH 19B', null) }), 'calculus').status).toBe('unmet')
  })

  it('physics: one full series; a 5/6 mix needs advisor confirmation', () => {
    expect(find(run(harness, { terms: edit(general, 'PHYS 6N', null) }), 'physics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(edit(general, 'PHYS 6C', 'PHYS 5C'), 'PHYS 6N', 'PHYS 5N') }), 'physics').status).toBe('cannot-check')
  })

  it('honors labs CHEM 8N / CHEM 110N substitute for 8M / 110L', () => {
    expect(failing(run(harness, { terms: edit(edit(general, 'CHEM 8M', 'CHEM 8N'), 'CHEM 110L', 'CHEM 110N') }))).toEqual([])
  })

  it('electives: two from the list', () => {
    expect(find(run(harness, { terms: edit(general, 'CHEM 143', null) }), 'electives').status).toBe('unmet')
    // CHEM 163C is required, not an elective
    expect(find(run(harness, { terms: edit(general, 'CHEM 143', 'CHEM 163C') }), 'electives').status).toBe('unmet')
  })

  it('BIOC 100A–C series fulfils CHEM 103 plus one elective', () => {
    const t = add(edit(edit(general, 'CHEM 103', 'BIOC 100A'), 'CHEM 143', 'BIOC 100B'), 'BIOC 100C')
    const r = run(harness, { terms: t })
    expect(find(r, 'biochem').status).toBe('met')
    expect(failing(r)).toEqual([])
    // only BIOC 100A+100B: CHEM 103 is not satisfied
    expect(find(run(harness, { terms: edit(general, 'CHEM 103', 'BIOC 100A').concat(plan(['2302', 'BIOC 100B'])) }), 'biochem').status).toBe('unmet')
  })

  it('CHEM 103 + BIOC 100C: BIOC 100C counts as an elective', () => {
    expect(failing(run(harness, { terms: edit(general, 'CHEM 143', 'BIOC 100C') }))).toEqual([])
  })

  it('DC/comprehensive: CHEM 151L plus one advanced lab', () => {
    const r = run(harness, { terms: edit(general, 'CHEM 146A', null) })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    // CHEM 124 can be both an elective and the DC lab (2025-26: the laboratory-course requirement still needs its own lab)
    const t = edit(edit(general, 'CHEM 146A', null), 'CHEM 143', 'CHEM 124')
    expect(failing(run(harness, { terms: t }))).toEqual(['adv-lab:unmet'])
    // BIOC 110L is a DC lab only in the biochemistry concentration
    expect(find(run(harness, { terms: edit(general, 'CHEM 146A', 'BIOC 110L') }), 'dc').status).toBe('unmet')
  })

  it('biochemistry concentration needs BIOL 20A/BIOE 20B and all of BIOC 100A–C', () => {
    expect(find(run(harness, { terms: edit(bioc, 'BIOE 20B', null), choices: bc }), 'intro-bio').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(bioc, 'BIOC 100C', 'CHEM 103'), choices: bc }), 'biochem').status).toBe('unmet')
  })

  // --- review 2026-10-06: adversarial records ---
  it('review: a chemistry graduate course may be an elective, asked only when needed', () => {
    // "Students may also satisfy the elective requirement by completing a chemistry graduate course with permission from the instructor and department."
    const t = edit(general, 'CHEM 143', 'CHEM 200A')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['attest:grad-elective:needs-attestation'])
    expect(failing(run(harness, { terms: add(general, 'CHEM 200A'), attested: [] }))).toEqual([])
    // the concentration has no electives at all
    expect(failing(run(harness, { terms: bioc, choices: bc, attested: [] }))).toEqual([])
  })

  it('review: BIOC 100A+100B without 100C does not replace CHEM 103', () => {
    const t = add(edit(general, 'CHEM 103', 'BIOC 100A'), 'BIOC 100B')
    expect(find(run(harness, { terms: t }), 'biochem').status).toBe('unmet')
  })

  it('review: a general-major record does not complete the concentration', () => {
    const f = failing(run(harness, { terms: general, choices: bc }))
    expect(f).toContain('intro-bio/BIOL20A:unmet')
    expect(f).toContain('biochem/BIOC100A:unmet')
  })

  it('review: CHEM 164 is not required in the concentration', () => {
    expect(failing(run(harness, { terms: edit(bioc, 'CHEM 164', null), choices: bc }))).toEqual([])
  })

  it('review: the DC lab may also be an elective (CHEM 124 as both)', () => {
    const t = add(edit(edit(general, 'CHEM 146A', 'CHEM 124'), 'CHEM 143', null), 'CHEM 146B')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('review: C- in the DC lab fails DC and the comprehensive', () => {
    const r = run(harness, { terms: general, grades: { 'CHEM 146A': 'C-' } })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })
})
