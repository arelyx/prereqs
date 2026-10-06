import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const common = plan(
  ['2268', 'MATH 19A', 'CHEM 3A', 'EDUC 50C'],
  ['2270', 'MATH 19B', 'CHEM 3B', 'BIOL 20A', 'ASTR 2'],
  ['2272', 'MATH 22', 'CHEM 3C', 'BIOE 20B'],
  ['2278', 'PHYS 6A', 'PHYS 6L', 'BIOE 20C', 'EART 10', 'EART 10L'],
  ['2280', 'PHYS 6B', 'PHYS 6M', 'ASTR 119'],
  ['2282', 'PHYS 6C', 'PHYS 6N', 'EART 110A'],
  ['2288', 'EDUC 100C', 'EDUC 181'],
  ['2290', 'EDUC 185L', 'EDUC 185C'],
)
// Physics + chemistry fields
const pc = [
  ...common,
  ...plan(
    ['2292', 'PHYS 5D', 'CHEM 8A', 'CHEM 8L'],
    ['2298', 'PHYS 102', 'CHEM 8B', 'CHEM 8M'],
    ['2300', 'PHYS 133', 'CHEM 163B'],
  ),
]
// Biology + Earth sciences fields
const be = [
  ...common,
  ...plan(
    ['2292', 'BIOL 105', 'EART 110B', 'EART 110M'],
    ['2298', 'BIOE 107', 'OCEA 90'],
    ['2300', 'BIOE 109', 'EART 120'],
  ),
]
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const PC = { fields: 'Physics and Chemistry' }
const BE = { fields: 'biology, earth sciences' }

describe('science-education-bs 2026-27', () => {
  it('asks for the two fields first', () => {
    expect(find(run(harness, { terms: pc }), 'choice:fields').status).toBe('needs-choice')
  })

  it('complete physics + chemistry record', () => {
    expect(failing(run(harness, { terms: pc, choices: PC }))).toEqual([])
  })

  it('complete biology + Earth sciences record', () => {
    expect(failing(run(harness, { terms: be, choices: BE }))).toEqual([])
  })

  it('MATH 22 is waived for biology + Earth sciences, required for physics + chemistry', () => {
    expect(failing(run(harness, { terms: edit(be, 'MATH 22', null), choices: BE }))).toEqual([])
    expect(find(run(harness, { terms: edit(pc, 'MATH 22', null), choices: PC }), 'math22').status).toBe('unmet')
  })

  it('physics specialization requires MATH 19A/19B (MATH 11 is fine otherwise)', () => {
    const t = edit(edit(pc, 'MATH 19A', 'MATH 11A'), 'MATH 19B', 'MATH 11B')
    expect(find(run(harness, { terms: t, choices: PC }), 'calc-a').status).toBe('unmet')
    const t2 = edit(edit(be, 'MATH 19A', 'MATH 11A'), 'MATH 19B', 'MATH 11B')
    expect(failing(run(harness, { terms: t2, choices: BE }))).toEqual([])
  })

  it('each field must be complete', () => {
    expect(find(run(harness, { terms: edit(pc, 'PHYS 133', null), choices: PC }), 'field-physics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(pc, 'CHEM 163B', null), choices: PC }), 'field-chem-ud').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(be, 'OCEA 90', null), choices: BE }), 'field-earth-core').status).toBe('unmet')
  })

  it('Earth sciences UD course: 5-credit EART 100–189, not EART 110A', () => {
    expect(find(run(harness, { terms: edit(be, 'EART 120', null), choices: BE }), 'field-earth-ud').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(be, 'EART 120', 'EART 190'), choices: BE }), 'field-earth-ud').status).toBe('unmet')
  })

  it('letter grades required', () => {
    expect(find(run(harness, { terms: pc, choices: PC, grades: { 'EDUC 181': 'P' } }), 'diversity').status).toBe('unmet')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = pc.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early, choices: PC }), 'gen-chem').status).toBe('unmet')
  })

  it('statistics: STAT 5, STAT 7 + 7L, or ASTR 119', () => {
    expect(find(run(harness, { terms: edit(pc, 'ASTR 119', 'STAT 5'), choices: PC }), 'statistics').status).toBe('met')
    expect(find(run(harness, { terms: edit(pc, 'ASTR 119', 'STAT 7'), choices: PC }), 'statistics').status).toBe('unmet')
  })

  it('DC needs EDUC 100A/100C and EDUC 185L; comprehensive EDUC 185C', () => {
    const r = run(harness, { terms: edit(pc, 'EDUC 185L', null), choices: PC })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(pc, 'EDUC 185C', null), choices: PC }), 'comprehensive').status).toBe('unmet')
  })

  it('CSET General Science waives the two non-specialization fields’ lower-division courses (not EART)', () => {
    // physics + chemistry: biology lower-division waived
    const noBio = edit(edit(edit(pc, 'BIOL 20A', null), 'BIOE 20B', null), 'BIOE 20C', null)
    expect(find(run(harness, { terms: noBio, choices: PC }), 'biology').status).toBe('unmet')
    expect(failing(run(harness, { terms: noBio, choices: { ...PC, cset: 'yes' } }))).toEqual([])
    // EART package never waived
    expect(find(run(harness, { terms: edit(noBio, 'EART 10L', null), choices: { ...PC, cset: 'yes' } }), 'earth').status).toBe('unmet')
  })

  it('CSET: chemistry waived but biology not → CHEM 3A or 4A still needed', () => {
    const noChem = edit(edit(edit(be, 'CHEM 3A', null), 'CHEM 3B', null), 'CHEM 3C', null)
    const r = run(harness, { terms: noChem, choices: { ...BE, cset: 'yes' } })
    expect(find(r, 'gen-chem').status).toBe('unmet')
    expect(find(r, 'physics').status).toBe('met') // physics waived
    expect(failing(run(harness, { terms: edit(be, 'CHEM 3B', null), choices: { ...BE, cset: 'yes' } }))).toEqual([])
  })
})
