import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'MATH 19B'],
  ['2272', 'CHEM 3C', 'MATH 22'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2280', 'CHEM 8B', 'CHEM 8M', 'PHYS 6B', 'PHYS 6M'],
  ['2282', 'PHYS 6C', 'PHYS 6N'],
  ['2288', 'CHEM 163A', 'CHEM 110'],
  ['2290', 'CHEM 151A', 'CHEM 122'],
  ['2292', 'CHEM 171'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2298', courses: cs }]

describe('chemistry-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('letter grade with C or better', () => {
    expect(find(run(harness, { terms: base, grades: { 'CHEM 122': 'P' } }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CHEM 110': 'C-' } }), 'two-of').status).toBe('unmet')
  })

  it('BIOC 163A substitutes for CHEM 163A', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 163A', 'BIOC 163A') }), 'chem163a').status).toBe('met')
  })

  it('two of CHEM 103/110/151A', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 151A', null) }), 'two-of').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 151A', 'CHEM 103') }), 'two-of').status).toBe('met')
  })

  it('BIOC 100A–C series replaces CHEM 103 and counts as one elective', () => {
    const t = add(edit(edit(base, 'CHEM 151A', 'BIOC 100A'), 'CHEM 171', 'BIOC 100B'), 'BIOC 100C')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    // without BIOC 100C the series is incomplete
    expect(find(run(harness, { terms: edit(edit(base, 'CHEM 151A', 'BIOC 100A'), 'CHEM 171', 'BIOC 100B') }), 'two-of').status).toBe('unmet')
  })

  it('not both BIOC 100A and CHEM 103', () => {
    const t = edit(edit(base, 'CHEM 151A', 'CHEM 103'), 'CHEM 171', 'BIOC 100A')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    // BIOC 100A is fine when CHEM 103 is not counted
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'BIOC 100A') }), 'electives').status).toBe('met')
    // ...even if CHEM 103 is taken but CHEM 110 and 151A fill the two-of
    expect(failing(run(harness, { terms: add(edit(base, 'CHEM 171', 'BIOC 100A'), 'CHEM 103') }))).toEqual([])
  })

  it('not both BIOC 163B and CHEM 163B as electives', () => {
    const t = edit(edit(base, 'CHEM 122', 'BIOC 163B'), 'CHEM 171', 'CHEM 163B')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('BIOC 100C counts as an elective after CHEM 103', () => {
    const t = edit(edit(base, 'CHEM 151A', 'CHEM 103'), 'CHEM 171', 'BIOC 100C')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'CHEM 171', 'BIOC 100C') }), 'electives').status).toBe('unmet')
  })

  it('CHEM 3 series without 3BL/3CL is accepted (no lab rule on this page)', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('met')
  })

  it('physics: mixed series is cannot-check; labs required', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 6A', 'PHYS 5A') }), 'physics').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'PHYS 6M', null) }), 'physics').status).toBe('unmet')
  })

  // --- review 2026-10-06: adversarial records ---
  it('review: MATH 19A then 11B (the page example) is met; MATH 11A + 19B defers to the external policy', () => {
    // "(for example, a student can take and complete MATH 19A and then take and complete MATH 11B) but must follow the Mathematics Department’s Calculus Series Transition Policy"
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calculus').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 19A', 'MATH 11A') }), 'calculus').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', null) }), 'calculus').status).toBe('unmet')
  })

  it('review: a chemistry graduate course may be an elective, asked only when needed', () => {
    // "Students may also satisfy the elective requirements by completing a chemistry graduate course with the permission of the instructor and department."
    const t = edit(base, 'CHEM 171', 'CHEM 200B')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['attest:grad-elective:needs-attestation'])
    expect(failing(run(harness, { terms: add(base, 'CHEM 200B'), attested: [] }))).toEqual([])
  })

  it('review: a course used in the two-of is not also an elective', () => {
    expect(find(run(harness, { terms: add(edit(base, 'CHEM 171', null), 'CHEM 110') }), 'electives').status).toBe('unmet')
  })

  it('review: CHEM 4 series with both labs; a lab missing fails', () => {
    let t = base
    for (const [a, b] of [['CHEM 3A', 'CHEM 4A'], ['CHEM 3B', 'CHEM 4B'], ['CHEM 3C', 'CHEM 4AL']]) t = edit(t, a, b)
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('review: empty plan', () => {
    const f = failing(run(harness, { terms: [], attested: [] }))
    expect(f).toEqual(expect.arrayContaining(['gen-chem:unmet', 'calculus:unmet', 'physics:unmet', 'two-of:unmet', 'electives:unmet']))
  })
})
