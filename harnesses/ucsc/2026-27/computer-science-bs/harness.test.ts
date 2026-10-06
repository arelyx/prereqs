import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'CSE 20', 'MATH 19A', 'CSE 16'],
  ['2270', 'CSE 30', 'MATH 19B', 'CSE 12'],
  ['2272', 'CSE 13S', 'AM 10', 'CSE 40'],
  ['2278', 'ECE 30', 'AM 30', 'CSE 101'],
  ['2280', 'CSE 101M', 'CSE 120', 'STAT 131'],
  ['2282', 'CSE 102', 'CSE 130', 'CSE 114A'],
  ['2288', 'CSE 138', 'CSE 140', 'CSE 115A'],
  ['2290', 'CSE 142', 'CSE 144'],
)
const swap = (from: string, to: string | null) =>
  base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('computer-science-bs 2026-27', () => {
  it('complete record (capstone CSE 138 also counts as an elective)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
  })

  it('P/NP in a required course does not count (Baskin letter-grade policy)', () => {
    const r = run(harness, { terms: base, grades: { 'CSE 101': 'P' } })
    expect(find(r, 'cse-ud/CSE101').status).toBe('unmet')
    expect(r.excluded.map((x) => x.enrollment.code)).toContain('CSE101')
  })

  it('mixing calculus packages does not satisfy the either/or option', () => {
    expect(find(run(harness, { terms: swap('MATH 19B', 'MATH 20B') }), 'calc').status).toBe('unmet')
  })

  it('electives need at least one CSE course', () => {
    const t = swap('CSE 140', 'MATH 115')
    const t2 = t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 142' ? ['MATH 116'] : c === 'CSE 144' ? ['AM 114'] : [c])) }))
    // electives would be CSE 138 + MATH 115 + MATH 116 + AM 114 → three AM/MATH: too many
    expect(find(run(harness, { terms: t2 }), 'electives').status).toBe('unmet')
  })

  it('a physics pair can replace one AM/STAT/MATH elective', () => {
    const noEl = swap('CSE 144', null).map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CSE 142') }))
    const t = [...noEl, { term: '2292', courses: ['PHYS 5A', 'PHYS 5C', 'MATH 115'] }]
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('met')
    // two physics pairs never count as two electives
    const t2 = [...swap('CSE 144', null).map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CSE 142') })), { term: '2292', courses: ['PHYS 5A', 'PHYS 5C', 'PHYS 6A', 'PHYS 6B'] }]
    expect(find(run(harness, { terms: t2 }), 'electives').status).toBe('unmet')
  })

  it('CSE 115A/185E are DC-only, never electives', () => {
    const t = [...swap('CSE 144', 'CSE 185E')]
    const r = run(harness, { terms: t })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('CSE 195 counts for DC or an elective, not both', () => {
    const t = swap('CSE 115A', 'CSE 195').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CSE 144') }))
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status === 'met' && find(r, 'electives').status === 'met').toBe(false)
  })

  it('a lecture with a lab needs the lab to count as an elective', () => {
    const t = swap('CSE 144', 'CSE 156')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    const t2 = swap('CSE 144', 'CSE 156').map((q) => (q.term === '2290' ? { ...q, courses: [...q.courses, 'CSE 156L'] } : q))
    expect(find(run(harness, { terms: t2 }), 'electives').status).toBe('met')
  })

  it('thesis-only comprehensive with the same CSE 195 as DC is flagged, not guessed', () => {
    const t = swap('CSE 115A', 'CSE 195').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CSE 138' && c !== 'CSE 140' && c !== 'CSE 144') }))
    const t2 = [...t, { term: '2292', courses: ['CSE 103', 'CSE 132', 'CSE 110A'] }]
    const r = run(harness, { terms: t2 })
    expect(find(r, 'comprehensive').status).toBe('cannot-check')
  })
})
