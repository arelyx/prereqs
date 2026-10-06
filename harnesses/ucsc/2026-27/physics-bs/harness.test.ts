import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const lower = plan(
  ['2268', 'MATH 19A', 'PHYS 5A', 'PHYS 5L', 'ASTR 119'],
  ['2270', 'MATH 19B', 'PHYS 5B', 'PHYS 5M'],
  ['2272', 'MATH 23A', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'MATH 23B', 'PHYS 5D'],
)
const general = [
  ...lower,
  ...plan(
    ['2280', 'PHYS 102', 'PHYS 116A'],
    ['2282', 'PHYS 116C', 'PHYS 105'],
    ['2288', 'PHYS 110A', 'PHYS 133'],
    ['2290', 'PHYS 110B', 'PHYS 112', 'PHYS 182'],
    ['2292', 'PHYS 134', 'PHYS 139A', 'PHYS 115'],
    ['2298', 'ASTR 112', 'PHYS 171'],
  ),
]
const qisTerms = [
  ...lower,
  ...plan(
    ['2280', 'PHYS 102', 'PHYS 116A', 'PHYS 133'],
    ['2282', 'PHYS 116C', 'PHYS 105'],
    ['2288', 'PHYS 110A', 'PHYS 139A'],
    ['2290', 'PHYS 112', 'PHYS 139B', 'PHYS 182'],
    ['2292', 'PHYS 150', 'PHYS 138', 'PHYS 156'],
    ['2298', 'PHYS 115'],
  ),
]
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2300', courses: cs }]
const qis = { concentration: 'Quantum Information Science' }

describe('physics-bs 2026-27', () => {
  it('complete general record (no choice needed)', () => {
    expect(failing(run(harness, { terms: general }))).toEqual([])
  })

  it('complete QIS record', () => {
    expect(failing(run(harness, { terms: qisTerms, choices: qis }))).toEqual([])
  })

  it('general: one of PHYS 110B / 139B is required', () => {
    const r = run(harness, { terms: edit(general, 'PHYS 110B', null) })
    expect(find(r, 'phys110b-139b').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(general, 'PHYS 110B', 'PHYS 139B') }), 'phys110b-139b').status).toBe('met')
  })

  it('general: both PHYS 110B and 139B — the other may count as an elective', () => {
    const r = run(harness, { terms: edit(general, 'PHYS 171', 'PHYS 139B') })
    expect(failing(r)).toEqual([])
  })

  it('general electives: three 5-credit courses, PHYS 100–180 or ASTR 111–118', () => {
    expect(find(run(harness, { terms: edit(general, 'PHYS 171', null) }), 'electives').status).toBe('unmet')
    // ASTR 119 is outside ASTR 111–118 (and is the programming course anyway)
    expect(find(run(harness, { terms: edit(general, 'PHYS 171', 'ASTR 136') }), 'electives').status).toBe('unmet')
    // PHYS 182 is above PHYS 180
    expect(find(run(harness, { terms: add(edit(general, 'PHYS 171', null), 'PHYS 195A', 'PHYS 195B') }), 'electives').status).toBe('unmet')
    // AM 107 is cross-listed as PHYS 107
    expect(find(run(harness, { terms: edit(general, 'PHYS 171', 'AM 107') }), 'electives').status).toBe('met')
  })

  it('a required course cannot also count as an elective', () => {
    const r = run(harness, { terms: edit(general, 'PHYS 171', null) })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'phys134').status).toBe('met')
  })

  it('honors calculus and honors physics alternatives', () => {
    const t = edit(edit(edit(general, 'MATH 19A', 'MATH 20A'), 'PHYS 5A', 'PHYS 15A'), 'PHYS 5C', 'PHYS 15C')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('MATH 21 + MATH 24 substitute for PHYS 116A', () => {
    const t = add(edit(general, 'PHYS 116A', 'MATH 21'), 'MATH 24')
    expect(find(run(harness, { terms: t }), 'phys116a').status).toBe('met')
    expect(find(run(harness, { terms: edit(general, 'PHYS 116A', 'MATH 21') }), 'phys116a').status).toBe('unmet')
  })

  it('PHYS 116C waiver: MATH 107 + math dual major', () => {
    const t = edit(general, 'PHYS 116C', 'MATH 107')
    expect(find(run(harness, { terms: t }), 'phys116c').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'phys116c').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: edit(general, 'PHYS 116C', null) }), 'phys116c').status).toBe('unmet')
  })

  it('letter grade required', () => {
    expect(find(run(harness, { terms: general, grades: { 'PHYS 105': 'P' } }), 'phys105').status).toBe('unmet')
  })

  it('lab courses are required', () => {
    expect(failing(run(harness, { terms: edit(general, 'PHYS 5M', null) }))).toEqual(['phys-5m:unmet'])
  })

  it('AP Physics C (score 5) exempts PHYS 5A/5C and their labs', () => {
    const t = edit(edit(general, 'PHYS 5A', null), 'PHYS 5L', null)
    // PHYS 5A as exam credit (no term) without PHYS 5L: needs the AP confirmation
    expect(find(run(harness, { terms: t, completed: ['PHYS 5A'] }), 'phys5l-or-ap').status).toBe('met')
    expect(find(run(harness, { terms: t, completed: ['PHYS 5A'], attested: [] }), 'phys5l-or-ap').status).toBe('needs-attestation')
    // PHYS 5A taken at UCSC without its lab: unmet
    expect(find(run(harness, { terms: edit(general, 'PHYS 5L', null) }), 'phys-5l').status).toBe('unmet')
  })

  it('programming: ASTR 119, CSE 20 or ASTR 19', () => {
    expect(find(run(harness, { terms: edit(general, 'ASTR 119', 'CSE 20') }), 'programming').status).toBe('met')
    expect(find(run(harness, { terms: edit(general, 'ASTR 119', 'CSE 30') }), 'programming').status).toBe('unmet')
  })

  it('DC: PHYS 182 or both PHYS 195A and 195B', () => {
    const t = edit(general, 'PHYS 182', 'PHYS 195A')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'PHYS 195B') }), 'dc').status).toBe('met')
  })

  it('comprehensive: PHYS 134 (general) / PHYS 138 (QIS)', () => {
    expect(find(run(harness, { terms: edit(general, 'PHYS 134', null) }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(qisTerms, 'PHYS 138', null), choices: qis }), 'comprehensive').status).toBe('unmet')
  })

  it('QIS: PHYS 134 not required, but PHYS 150, 139B, 138 and 156/157 are', () => {
    expect(find(run(harness, { terms: edit(qisTerms, 'PHYS 156', 'PHYS 157'), choices: qis }), 'materials').status).toBe('met')
    expect(find(run(harness, { terms: edit(qisTerms, 'PHYS 150', 'CSE 109'), choices: qis }), 'phys150').status).toBe('met')
    expect(find(run(harness, { terms: edit(qisTerms, 'PHYS 139B', null), choices: qis }), 'phys139b').status).toBe('unmet')
  })

  it('QIS elective: a PHYS 100–180 course not used elsewhere (ASTR does not count)', () => {
    expect(find(run(harness, { terms: edit(qisTerms, 'PHYS 115', 'ASTR 112'), choices: qis }), 'electives').status).toBe('unmet')
    // both 156 and 157: the second counts as the elective
    expect(find(run(harness, { terms: edit(qisTerms, 'PHYS 115', 'PHYS 157'), choices: qis }), 'electives').status).toBe('met')
  })
})
