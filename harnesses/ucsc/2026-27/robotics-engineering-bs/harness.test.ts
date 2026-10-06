import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'AM 10', 'CSE 12', 'ECE 9'],
  ['2278', 'AM 20', 'CSE 13S', 'PHYS 5C', 'PHYS 5N'],
  ['2280', 'AM 30', 'ECE 10', 'CSE 101'],
  ['2282', 'ECE 101', 'ECE 101L', 'CSE 100', 'CSE 100L'],
  ['2288', 'ECE 103', 'ECE 103L', 'CSE 107'],
  ['2290', 'ECE 118', 'ECE 141'],
  ['2292', 'ECE 121', 'ECE 167'],
  ['2298', 'ECE 129A', 'ECE 242'],
  ['2300', 'ECE 129B', 'CSE 142'],
  ['2302', 'ECE 129C'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('robotics-engineering-bs 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('lecture with a required concurrent lab counts only with the lab', () => {
    expect(failing(run(harness, { terms: swap('CSE 142', ['ECE 171']) }))).toEqual(['ud-grad:unmet'])
    expect(failing(run(harness, { terms: swap('CSE 142', ['ECE 171', 'ECE 171L']) }))).toEqual([])
  })

  it('an advanced robotics elective cannot also be the upper-division/graduate elective', () => {
    expect(failing(run(harness, { terms: swap('CSE 142', []) }))).toEqual(['ud-grad:unmet'])
    // ECE 145 is only on the UD/grad list (ECE 245 is the advanced one)
    expect(failing(run(harness, { terms: swap('ECE 242', ['ECE 145']) }))).toEqual(['advanced:unmet'])
  })

  it('ECE 218 for ECE 118 only by petition', () => {
    const t = swap('ECE 118', ['ECE 218'])
    expect(find(run(harness, { terms: t, attested: ['exit survey'] }), 'ece118').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('capstone: ECE 129A + two ECE 195 (10 credits)', () => {
    const t = swap('ECE 129B', ['ECE 195']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'ECE 129C' ? 'ECE 195' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
    const one = swap('ECE 129B', ['ECE 195']).map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'ECE 129C') }))
    expect(failing(run(harness, { terms: one }))).toEqual(['dc:unmet', 'capstone:unmet'])
  })

  it('exit requirement is an attestation', () => {
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual(['attest:exit-requirement:needs-attestation'])
  })

  it('ECE 9 and ECE 10 are required', () => {
    expect(failing(run(harness, { terms: swap('ECE 10', []) }))).toEqual(['ld-all/ECE10:unmet'])
  })

  it('CSE 20 test-out (review: §1a): offered only when CSE 20 is absent; attested ⇒ met by test-out; AP credit counts', () => {
    const r = run(harness, { terms: swap('CSE 20', []) })
    expect(failing(r)).toEqual([])
    expect(find(r, 'cse20').detail).toMatch(/test-out/)
    expect(failing(run(harness, { terms: swap('CSE 20', []), attested: ['exit survey'] }))).toEqual(['cse20:needs-attestation'])
    expect(failing(run(harness, { terms: swap('CSE 20', []), completed: ['CSE 20'], attested: ['exit survey'] }))).toEqual([])
    // A failed CSE 20 is not rescued by the attestation.
    expect(failing(run(harness, { terms: base, grades: { 'CSE 20': 'F' } }))).toEqual(['cse20:unmet'])
  })

  it('review: ECE 118 in the plan means no ECE 218 petition is asked; a lab alone is not the elective', () => {
    expect(failing(run(harness, { terms: swap('ECE 118', ['ECE 118', 'ECE 218']), attested: ['exit survey'] }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CSE 142', ['ECE 171L']) }))).toEqual(['ud-grad:unmet'])
  })

  it('review: a second advanced robotics course does not fill the UD/graduate elective; P in a non-ECE course fails', () => {
    expect(failing(run(harness, { terms: swap('CSE 142', ['ECE 243']) }))).toEqual(['ud-grad:unmet'])
    expect(failing(run(harness, { terms: swap('CSE 142', ['CMPM 146']), grades: { 'CMPM 146': 'P' } }))).toEqual(['ud-grad:unmet'])
  })

  it('letter grades are required, also for courses from other departments', () => {
    expect(find(run(harness, { terms: base, grades: { 'MATH 19A': 'P' } }), 'ld-all/MATH19A').status).toBe('unmet')
  })

  it('PHYS 15A / 15C substitutes', () => {
    const t = swap('PHYS 5A', ['PHYS 15A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHYS 5C' ? 'PHYS 15C' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('MATH 23A, MATH 21, MATH 24, ECE 13, STAT 131 alternatives', () => {
    const m: Record<string, string> = { 'AM 30': 'MATH 23A', 'AM 10': 'MATH 21', 'AM 20': 'MATH 24', 'CSE 13S': 'ECE 13', 'CSE 107': 'STAT 131' }
    const t = base.map((q) => ({ ...q, courses: q.courses.map((c) => m[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
