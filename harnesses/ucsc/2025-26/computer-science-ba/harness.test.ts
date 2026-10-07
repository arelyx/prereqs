import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'AM 10'],
  ['2272', 'CSE 12', 'CSE 40'],
  ['2278', 'CSE 101P', 'CSE 102'],
  ['2280', 'CSE 120', 'CSE 140'],
  ['2282', 'CSE 183', 'MATH 110', 'LING 112'],
  ['2288', 'CSE 115A'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('computer-science-ba 2025-26', () => {
  it('complete record is met (CSE 140 is breadth and capstone at once)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('electives need at least one upper-division CSE 100–189 or CSE 195', () => {
    const t = swap('CSE 183', ['ECON 101'])
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 183', ['CSE 195']) }), 'electives').status).toBe('met')
  })

  it('the DC course cannot also be an elective', () => {
    // CSE 115A is used for DC; without CSE 183 there are only two electives
    const t = swap('CSE 183', [])
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    // review: "except for the DC courses CSE 115A and CSE 185E/CSE 185S" — a
    // second DC-list course is not an elective either
    expect(find(run(harness, { terms: swap('CSE 183', ['CSE 185E']) }), 'electives').status).toBe('unmet')
  })

  it('a lecture with a lab counts only with its lab (ENVS 115A needs 115L)', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['ENVS 115A']) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('LING 112', ['ENVS 115A', 'ENVS 115L']) }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('LING 112', ['MATH 148']) }), 'electives').status).toBe('unmet')
  })

  it('a lab alone is not an elective', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['CSE 100L']) }), 'electives').status).toBe('unmet')
  })

  it('a course outside the list is not an elective', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['ECON 113']) }), 'electives').status).toBe('unmet')
  })

  it('breadth needs three courses from the breadth lists', () => {
    const t = swap('CSE 120', ['MATH 115']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 183' ? 'CSE 107' : c)) }))
    const r = run(harness, { terms: t })
    expect(find(r, 'breadth').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('CSE 101 alternative to CSE 101P; second breadth list counts', () => {
    expect(failing(run(harness, { terms: swap('CSE 101P', ['CSE 101']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 120' ? 'CSE 130' : c)) })) }))).toEqual([])
  })

  it('no capstone and no thesis fails the comprehensive requirement', () => {
    // CSE 140 → CSE 142 (breadth, not a capstone); CSE 183 → CSE 118 (not a capstone)
    const t = swap('CSE 140', ['CSE 142']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 183' ? 'CSE 118' : c)) }))
    const r = run(harness, { terms: t })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(failing(r)).toEqual(['capstone:unmet', 'thesis:unmet'])
  })

  it('review: one CSE 195 may be both the DC course and the senior thesis', () => {
    // "CSE 195 can count toward satisfying the minimum number of upper-division
    // electives requirement or completing the DC requirement, but not both."
    const t = swap('CSE 140', ['CSE 142']).map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 183' ? ['CSE 118'] : c === 'CSE 115A' ? ['CSE 195'] : [c])) }))
    const r = run(harness, { terms: t })
    expect(find(r, 'thesis').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('CSE 40 test-out (review: §1a): offered only when CSE 40 is absent; attested ⇒ met by test-out', () => {
    const t = swap('CSE 40', [])
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['cse40:needs-attestation'])
    const r = run(harness, { terms: t })
    expect(find(r, 'cse40').status).toBe('met')
    expect(find(r, 'cse40').detail).toMatch(/test-out/)
    expect(failing(run(harness, { terms: base, grades: { 'CSE 40': 'F' } }))).toEqual(['cse40:unmet'])
  })

  it('CSE 20 test-out (review: §1a): attestation when CSE 20 is absent', () => {
    expect(failing(run(harness, { terms: swap('CSE 20', []), attested: [] }))).toEqual(['cse20:needs-attestation'])
    expect(failing(run(harness, { terms: swap('CSE 20', []) }))).toEqual([])
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual([])
  })

  it('MATH 20A/20B option; mixed packages do not count', () => {
    const t = swap('MATH 19A', ['MATH 20A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MATH 19B' ? 'MATH 20B' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: swap('MATH 19A', ['MATH 20A']) }))).toEqual(['calc:unmet'])
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'MATH 110': 'P' } }), 'electives').status).toBe('unmet')
  })

  it('review: any 5+ credit Baskin Engineering course 100–189 and CSE 201–279 are B.A. electives; CSE 280–289 are not', () => {
    // "1. Any 5-credit or more upper-division course with a number between 100 and 189 offered by Baskin Engineering"
    expect(find(run(harness, { terms: swap('LING 112', ['AM 147']) }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('LING 112', ['ECE 101', 'ECE 101L']) }), 'electives').status).toBe('met')
    // "2. Any 5-credit or more CSE course with a number between 201 and 279."
    expect(find(run(harness, { terms: swap('LING 112', ['CSE 201']) }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('LING 112', ['CSE 280A']) }), 'electives').status).toBe('unmet')
  })

  it('review: cross-listed codes are one course (PHYS 150 = CSE 109; CSE 185S = CSE 185E)', () => {
    expect(find(run(harness, { terms: swap('LING 112', ['CSE 109']) }), 'electives').status).toBe('met')
    const both = swap('LING 112', ['CSE 109', 'PHYS 150']).map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'MATH 110') }))
    expect(find(run(harness, { terms: both }), 'electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap('CSE 115A', ['CSE 185S']) }))).toEqual([])
  })

  it('review: a capstone lecture with a required lab counts only with it; a lab alone is not a capstone', () => {
    const noCap = swap('CSE 140', ['CSE 142'])
    const t = (extra: string[]) => noCap.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 183' ? ['CSE 118', ...extra] : [c])) }))
    expect(find(run(harness, { terms: t(['CSE 156']) }), 'capstone').status).toBe('unmet')
    expect(find(run(harness, { terms: t(['CSE 156L']) }), 'capstone').status).toBe('unmet')
    expect(find(run(harness, { terms: t(['CSE 156', 'CSE 156L']) }), 'capstone').status).toBe('met')
  })

  it('review: with CSE 115A and CSE 195, CSE 115A is the DC course and CSE 195 an elective', () => {
    const r = run(harness, { terms: swap('LING 112', ['CSE 195']) })
    expect((find(r, 'dc').used ?? []).map((e) => e.code)).toEqual(['CSE115A'])
    expect(failing(r)).toEqual([])
  })

  it('review: a repeatable or cross-listed course is still one elective', () => {
    const t = swap('LING 112', ['CSE 109', 'PHYS 150']).map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'MATH 110') }))
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })
})
