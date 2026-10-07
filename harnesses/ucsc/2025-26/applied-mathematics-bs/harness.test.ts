import { describe, expect, it } from 'vitest'
import { failing, find, ids, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'AM 10', 'CSE 20'],
  ['2270', 'MATH 19B', 'AM 20', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'AM 30', 'MATH 100', 'ECON 1'],
  ['2278', 'AM 100', 'AM 129', 'STAT 131'],
  ['2280', 'AM 112', 'AM 114', 'AM 147'],
  ['2282', 'AM 115', 'MATH 105A', 'CSE 101'],
  ['2288', 'AM 170A'],
  ['2290', 'AM 170B'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('applied-mathematics-bs 2025-26', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('letter grades are required (Baskin)', () => {
    expect(find(run(harness, { terms: base, grades: { 'AM 114': 'P' } }), 'core-am114').status).toBe('unmet')
  })

  it('MATH 23A alone is not the multivariable option; 23A + 23B is', () => {
    expect(find(run(harness, { terms: swap('AM 30', 'MATH 23A') }), 'multivar').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('AM 30', 'MATH 23A', 'MATH 23B') }), 'multivar').status).toBe('met')
  })

  it('two lower-division electives are required', () => {
    expect(find(run(harness, { terms: swap('ECON 1') }), 'ld-electives').status).toBe('unmet')
  })

  it('2025-26: PHYS 15A / PHYS 15C and CSE 40 are not lower-division electives', () => {
    expect(find(run(harness, { terms: swap('ECON 1', 'PHYS 15A') }), 'ld-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 1', 'PHYS 15C') }), 'ld-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 1', 'CSE 40') }), 'ld-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 1', 'PHYS 5C') }), 'ld-electives').status).toBe('met')
  })

  it('STAT 7L alone is not a lower-division elective; STAT 7 + 7L is one', () => {
    expect(find(run(harness, { terms: swap('ECON 1', 'STAT 7L') }), 'ld-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 1', 'STAT 7', 'STAT 7L') }), 'ld-electives').status).toBe('met')
  })

  it('core AM courses are not upper-division electives', () => {
    // five core AM courses on the record, but only two real electives left
    expect(find(run(harness, { terms: swap('AM 115') }), 'ud-electives').status).toBe('unmet')
  })

  it('AM 200 / AM 211 / AM 280-series do not count; other graduate AM courses do', () => {
    expect(find(run(harness, { terms: swap('AM 115', 'AM 211') }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('AM 115', 'AM 280A') }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('AM 115', 'AM 213A') }), 'ud-electives').status).toBe('met')
  })

  it('at most one independent study elective', () => {
    const t = swap('AM 115', 'AM 198').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'CSE 101' ? 'AM 195' : c)) }))
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('AM 115', 'AM 198') }))).toEqual([])
  })

  it('MATH courses off the list (e.g. MATH 103A) are not electives', () => {
    expect(find(run(harness, { terms: swap('MATH 105A', 'MATH 103A') }), 'ud-electives').status).toBe('unmet')
  })

  it('EART 125 and EART 225 count once', () => {
    const t = swap('AM 115', 'EART 125').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'CSE 101' ? 'EART 225' : c)) }))
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('cross-listed OCEA 172 counts as EART 172', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'OCEA 172') }), 'ud-electives').status).toBe('met')
  })

  it('comprehensive: AM 170A + AM 195 senior thesis also works; AM 170A alone does not', () => {
    expect(failing(run(harness, { terms: swap('AM 170B', 'AM 195') }))).toEqual([])
    expect(find(run(harness, { terms: swap('AM 170B') }), 'comprehensive').status).toBe('unmet')
  })

  it('DC needs AM 170A', () => {
    const r = run(harness, { terms: swap('AM 170A') })
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('AM 170B cannot be both capstone and elective', () => {
    expect(find(run(harness, { terms: swap('AM 115', 'AM 170B') }), 'ud-electives').status).toBe('unmet')
  })

  it('physics double majors: PHYS 116A for AM 100 needs approval', () => {
    const t = swap('AM 100', 'PHYS 116A')
    expect(find(run(harness, { terms: t, attested: [] }), 'core').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(ids(run(harness, { terms: base }))).not.toContain('attest:physics-double-major')
  })

  it('2025-26: no exit survey; the complete record needs no attestation', () => {
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual([])
    expect(ids(run(harness, { terms: base }))).not.toContain('exit')
  })

  it('both AM 147 and MATH 148: elective status is not called unmet', () => {
    const r = run(harness, { terms: swap('AM 115', 'MATH 148') })
    expect(find(r, 'ud-electives').status).toBe('cannot-check')
  })

  it('MATH 21 / MATH 24 / CSE 16 / ASTR 19 alternatives', () => {
    const t = base.map((x) => ({ ...x, courses: x.courses.map((c) => ({ 'AM 10': 'MATH 21', 'AM 20': 'MATH 24', 'MATH 100': 'CSE 16', 'CSE 20': 'ASTR 19' } as Record<string, string>)[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('2025-26: ECON 22P is not a programming option', () => {
    expect(find(run(harness, { terms: swap('CSE 20', 'ECON 22P'), attested: [] }), 'programming').status).not.toBe('met')
  })

  it('2025-26: BME 110 and STAT 204 are not upper-division electives', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'BME 110') }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 101', 'STAT 204') }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 101', 'STAT 205') }), 'ud-electives').status).toBe('met')
  })

  it('programming: the CSE 20 Testout exam is an attestation alternative', () => {
    const t = swap('CSE 20')
    expect(find(run(harness, { terms: t, attested: [] }), 'programming').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['CSE 20 testout'] }), 'programming').status).toBe('met')
  })

  it('ECON 100A and ECON 100M: credit for only one', () => {
    const t = swap('AM 115', 'ECON 100A').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'CSE 101' ? 'ECON 100M' : c)) }))
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('review: AM 212A is no elective next to core AM 112 (catalog: no credit for both)', () => {
    // AM 212A: "Students cannot receive credit for this course and AM 112."
    expect(find(run(harness, { terms: swap('AM 115', 'AM 212A') }), 'ud-electives').status).toBe('unmet')
    // AM 115 and AM 215 likewise count once
    expect(find(run(harness, { terms: swap('CSE 101', 'AM 215') }), 'ud-electives').status).toBe('unmet')
  })

  it('review: CSE 20 test-out is offered only when CSE 20 is absent; a failed or P/NP CSE 20 stays unmet', () => {
    expect(find(run(harness, { terms: swap('CSE 20') }), 'programming').detail).toContain('test-out')
    const failed = run(harness, { terms: base, grades: { 'CSE 20': 'F' } })
    expect(find(failed, 'programming').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CSE 20': 'P' } }), 'programming').status).toBe('unmet')
  })

  it('review: CSE 20 taken after CSE 30 earns no credit and does not satisfy programming', () => {
    // CSE 20: "Students may not receive credit for CSE 20 after receiving credit for CSE 30."
    const t = [{ term: '2266', courses: ['CSE 30'] }, ...base]
    expect(find(run(harness, { terms: t }), 'programming').status).toBe('unmet')
    expect(find(run(harness, { terms: [...t, { term: '2292', courses: ['ASTR 19'] }] }), 'programming').status).toBe('met')
  })

  it('review: cross-listed CSE 109 (PHYS 150) and EART 260 (OCEA 260) are listed electives', () => {
    const t = swap('CSE 101', 'CSE 109').map((x) => ({ ...x, courses: x.courses.map((c) => (c === 'MATH 105A' ? 'EART 260' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('review: a lab alone (CSE 161L) is not an elective', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 161L') }), 'ud-electives').status).toBe('unmet')
  })

  it('review: mixed calculus series MATH 19A + MATH 20B is not one of the two series', () => {
    expect(find(run(harness, { terms: swap('MATH 19B', 'MATH 20B') }), 'calc').status).toBe('unmet')
  })

  it('2025-26: ASTR 171 (cross-listed PHYS 171) is an elective', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'ASTR 171') }), 'ud-electives').status).toBe('met')
  })
})
