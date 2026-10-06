import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'PHYS 5A', 'PHYS 5L', 'ASTR 119'],
  ['2270', 'MATH 19B', 'PHYS 5B', 'PHYS 5M', 'ASTR 21'],
  ['2272', 'MATH 23A', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'MATH 23B', 'PHYS 5D'],
  ['2280', 'PHYS 102', 'PHYS 116A'],
  ['2282', 'PHYS 116C', 'PHYS 105'],
  ['2288', 'PHYS 110A', 'PHYS 133', 'ASTR 112'],
  ['2290', 'PHYS 110B', 'PHYS 112', 'PHYS 182'],
  ['2292', 'PHYS 139A', 'PHYS 135', 'ASTR 113'],
  ['2298', 'PHYS 171'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2300', courses: cs }]

describe('physics-astrophysics-bs 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('ASTR 21, or both ASTR 9A and 9B', () => {
    expect(find(run(harness, { terms: edit(base, 'ASTR 21', null) }), 'astr-intro').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'ASTR 21', 'ASTR 9A') }), 'astr-intro').status).toBe('unmet')
    expect(find(run(harness, { terms: add(edit(base, 'ASTR 21', 'ASTR 9A'), 'ASTR 9B') }), 'astr-intro').status).toBe('met')
  })

  it('PHYS 110B is required (no either/or as in the general physics major)', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 110B', 'PHYS 139B') }), 'phys110b').status).toBe('unmet')
  })

  it('advanced lab options: PHYS 135 / ASTR 135, 135A+135B, ASTR 136, three ASTR 136 modules', () => {
    const noLab = edit(base, 'PHYS 135', null)
    expect(find(run(harness, { terms: noLab }), 'adv-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: noLab }), 'comprehensive').status).toBe('unmet')
    expect(failing(run(harness, { terms: add(noLab, 'ASTR 135') }))).toEqual([])
    expect(failing(run(harness, { terms: add(noLab, 'ASTR 136') }))).toEqual([])
    expect(failing(run(harness, { terms: add(noLab, 'PHYS 135A', 'PHYS 135B') }))).toEqual([])
    expect(find(run(harness, { terms: add(noLab, 'PHYS 135A') }), 'adv-lab').status).toBe('unmet')
    expect(failing(run(harness, { terms: add(noLab, 'ASTR 136A', 'ASTR 136C', 'ASTR 136H') }))).toEqual([])
    expect(find(run(harness, { terms: add(noLab, 'ASTR 136A', 'ASTR 136C') }), 'adv-lab').status).toBe('unmet')
  })

  it('electives: three from the list; PHYS 139B and other PHYS courses do not count', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 171', 'PHYS 139B') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 171', 'ASTR 114') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 171', 'EART 162') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 171', 'EART 161') }), 'electives').status).toBe('unmet')
  })

  it('letter grades required', () => {
    expect(find(run(harness, { terms: base, grades: { 'ASTR 112': 'P' } }), 'electives').status).toBe('unmet')
  })

  it('honors physics alternatives and MATH 21 + 24 for PHYS 116A', () => {
    const t = add(edit(edit(base, 'PHYS 5A', 'PHYS 15A'), 'PHYS 116A', 'MATH 21'), 'MATH 24')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('PHYS 116C waiver: MATH 107 + math dual major', () => {
    const t = edit(base, 'PHYS 116C', 'MATH 107')
    expect(find(run(harness, { terms: t }), 'phys116c').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'phys116c').status).toBe('needs-attestation')
  })

  it('AP Physics C E&M (score 5) exempts PHYS 5C and PHYS 5N', () => {
    const t = edit(edit(base, 'PHYS 5C', null), 'PHYS 5N', null)
    expect(failing(run(harness, { terms: t, completed: ['PHYS 5C'] }))).toEqual([])
    expect(find(run(harness, { terms: t, completed: ['PHYS 5C'], attested: [] }), 'phys5n-or-ap').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: edit(base, 'PHYS 5N', null) }), 'phys-5n').status).toBe('unmet')
  })

  it('DC: PHYS 182 or PHYS 195A + 195B', () => {
    const t = edit(base, 'PHYS 182', 'PHYS 195A')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'PHYS 195B') }), 'dc').status).toBe('met')
  })
})
