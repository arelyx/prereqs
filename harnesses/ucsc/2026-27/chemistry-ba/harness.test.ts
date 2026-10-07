import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'CHEM 3A', 'MATH 11A'],
  ['2270', 'CHEM 3B', 'MATH 11B'],
  ['2272', 'CHEM 3C', 'MATH 22'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 5A', 'PHYS 5L'],
  ['2280', 'CHEM 8B', 'CHEM 8M', 'PHYS 5B', 'PHYS 5M'],
  ['2282', 'PHYS 5C', 'PHYS 5N'],
  ['2288', 'CHEM 110', 'CHEM 110L', 'CHEM 163A'],
  ['2290', 'CHEM 151A', 'CHEM 151L', 'CHEM 163B'],
  ['2292', 'CHEM 164', 'CHEM 146B'],
  ['2298', 'CHEM 103', 'CHEM 171'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2300', courses: cs }]

describe('chemistry-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('no advanced-mathematics, biochemistry or CHEM 163C requirement (unlike the B.S.)', () => {
    const r = run(harness, { terms: base })
    expect(r.status).toBe('met')
  })

  it('grade of C or better, letter grade', () => {
    expect(find(run(harness, { terms: base, grades: { 'CHEM 164': 'D' } }), 'chem164').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CHEM 171': 'P' } }), 'electives').status).toBe('unmet')
  })

  it('BIOC 163A/163B substitute and may be mixed with the CHEM 163 series', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 163B', 'BIOC 163B') }), 'pchem').status).toBe('met')
    expect(find(run(harness, { terms: edit(edit(base, 'CHEM 163A', 'BIOC 163A'), 'CHEM 163B', 'BIOC 163B') }), 'pchem').status).toBe('met')
  })

  it('advanced lab is required and CHEM 124 cannot be both lab and elective', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 146B', null) }), 'adv-lab').status).toBe('unmet')
    const t = edit(edit(base, 'CHEM 146B', 'CHEM 124'), 'CHEM 171', null)
    expect(run(harness, { terms: t }).status).toBe('unmet')
    expect(failing(run(harness, { terms: add(t, 'CHEM 171') }))).toEqual([])
  })

  it('electives: not both BIOC 100A and CHEM 103', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'BIOC 100A') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 103', 'CHEM 163C') }), 'electives').status).toBe('met')
  })

  it('DC/comprehensive: CHEM 151L + one advanced lab', () => {
    const r = run(harness, { terms: edit(base, 'CHEM 146B', null) })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: base }), 'comprehensive').status).toBe('met')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: [...early, { term: '2262', courses: ['CHEM 3BL', 'CHEM 3CL'] }] }), 'gen-chem').status).toBe('met')
  })

  it('physics series 5 or 6 complete; mixed series is cannot-check', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 5B', 'PHYS 6B') }), 'physics').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'PHYS 5L', null) }), 'physics').status).toBe('unmet')
  })

  it('honors organic labs', () => {
    expect(failing(run(harness, { terms: edit(edit(base, 'CHEM 8M', 'CHEM 8N'), 'CHEM 110L', 'CHEM 110N') }))).toEqual([])
    expect(find(run(harness, { terms: edit(base, 'CHEM 8M', null) }), 'chem8m').status).toBe('unmet')
  })

  // --- review 2026-10-06: adversarial records ---
  it('review: a chemistry graduate course may be an elective, asked only when needed', () => {
    // "Students may also satisfy the elective requirement by completing a chemistry graduate course with the permission of the instructor and department."
    const t = edit(base, 'CHEM 171', 'CHEM 200A')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['attest:grad-elective:needs-attestation'])
    expect(failing(run(harness, { terms: add(base, 'CHEM 200A'), attested: [] }))).toEqual([])
  })

  it('review: a mixed MATH 11/19 pair defers to the external transition policy (cannot-check)', () => {
    // "Students may combine the MATH 11 and MATH 19 series in accordance with the Mathematics Department’s Calculus Series Transition Policy."
    expect(find(run(harness, { terms: edit(base, 'MATH 11B', 'MATH 19B') }), 'calculus').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 11A', 'MATH 19A'), 'MATH 11B', 'MATH 19B') }), 'calculus').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 11B', null) }), 'calculus').status).toBe('unmet')
  })

  it('review: BIOC 100A and CHEM 103 both taken: only one counts as an elective', () => {
    const t = edit(base, 'CHEM 171', 'BIOC 100A')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('review: C- fails the C rule; P fails the letter rule', () => {
    expect(failing(run(harness, { terms: base, grades: { 'CHEM 8L': 'C-' } }))).toEqual(['orgo-core/CHEM8L:unmet'])
    expect(failing(run(harness, { terms: base, grades: { 'CHEM 151L': 'P' } }))).toContain('inorganic/CHEM151L:unmet')
  })

  it('review: a lab without its lecture does not complete physics; CHEM 4 series with labs completes general chemistry', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 5C', null) }), 'physics').status).toBe('unmet')
    let t = base
    for (const [a, b] of [['CHEM 3A', 'CHEM 4A'], ['CHEM 3B', 'CHEM 4AL'], ['CHEM 3C', 'CHEM 4B']]) t = edit(t, a, b)
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('review: empty plan', () => {
    const f = failing(run(harness, { terms: [], attested: [] }))
    expect(f).toContain('gen-chem:unmet')
    expect(f).toContain('electives:unmet')
    expect(f).toContain('adv-lab:unmet')
  })
})
