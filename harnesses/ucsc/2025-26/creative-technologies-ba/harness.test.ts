import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2298', courses: cs }]

// 2025-26: CT 110 (planned under its listed code), one CT 160-series course,
// three listed breadth electives (HAVC 141N upper-division).
const base = plan(
  ['2268', 'ART 10D', 'MUSC 80L'],
  ['2278', 'CT 1', 'CT 10', 'CT 100'],
  ['2280', 'CT 1', 'CT 11', 'CT 101'],
  ['2282', 'CT 1', 'CT 20', 'CT 120'],
  ['2288', 'CT 125', 'HAVC 141N'],
  ['2290', 'CT 110', 'CT 167N'],
  ['2292', 'CT 195'],
)

describe('creative-technologies-ba 2025-26', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('three quarters of CT 1 are required', () => {
    const t = edit(base, 'CT 1', null).map((q, i) => (i === 2 ? { ...q, courses: [...q.courses, 'CT 1'] } : q))
    expect(find(run(harness, { terms: t }), 'ct1').status).toBe('unmet')
  })

  it('2025-26: breadth electives come from the listed courses; three are needed', () => {
    expect(find(run(harness, { terms: edit(base, 'MUSC 80L', null) }), 'breadth').status).toBe('unmet')
    expect(failing(run(harness, { terms: edit(base, 'MUSC 80L', 'THEA 80N') }))).toEqual([])
  })

  it('2025-26: at least one breadth elective must be upper-division', () => {
    const r = run(harness, { terms: edit(base, 'HAVC 141N', 'FILM 80A') })
    expect(find(r, 'breadth').status).toBe('unmet')
  })

  it('2025-26: an unlisted arts course counts only by petition; a non-arts course never', () => {
    const t = edit(base, 'MUSC 80L', 'ART 15')
    expect(find(run(harness, { terms: t, attested: [] }), 'breadth').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t }), 'breadth').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MUSC 80L', 'MATH 19A') }), 'breadth').status).toBe('unmet')
    // listed courses do not trigger the petition
    expect(find(run(harness, { terms: base, attested: [] }), 'breadth').status).toBe('met')
  })

  it('2025-26: CT 110 is required; CT 151 is not', () => {
    expect(find(run(harness, { terms: edit(base, 'CT 110', null) }), 'ct110').status).toBe('unmet')
    expect(() => find(run(harness, { terms: base }), 'ct151')).toThrow()
  })

  it('2025-26: CT 167I (same title as the pending CT 110) is cannot-check, not met', () => {
    const t = edit(base, 'CT 110', 'CT 167I')
    expect(find(run(harness, { terms: t }), 'ct110').status).toBe('cannot-check')
    // CT 167I cannot be both CT 110 and the special topic
    const r = run(harness, { terms: edit(t, 'CT 167N', null) })
    expect([find(r, 'ct110').status, find(r, 'special-topics').status]).toContain('unmet')
  })

  it('2025-26: special topics: one CT 160-series course', () => {
    expect(find(run(harness, { terms: edit(base, 'CT 167N', null) }), 'special-topics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CT 167N', 'CT 161') }), 'special-topics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'CT 167N', 'CT 167Q') }), 'special-topics').status).toBe('met')
  })

  it('DC needs CT 101 and CT 195; comprehensive is CT 195', () => {
    const r = run(harness, { terms: edit(base, 'CT 195', null) })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CT 101', null) }), 'dc').status).toBe('unmet')
  })

  it('a CT core course cannot double as a breadth elective; a fourth CT 1 is not one', () => {
    const t = add(edit(base, 'MUSC 80L', null), 'CT 1')
    expect(find(run(harness, { terms: t }), 'breadth').status).toBe('unmet')
  })

  it('ART 102 counts as CT 100 (cross-listed)', () => {
    expect(failing(run(harness, { terms: edit(base, 'CT 100', 'ART 102') }))).toEqual([])
  })

  it('P grades are accepted', () => {
    expect(failing(run(harness, { terms: base, grades: { 'CT 120': 'P' } }))).toEqual([])
  })
})
