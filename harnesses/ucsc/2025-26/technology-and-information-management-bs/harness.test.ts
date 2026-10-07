import { describe, expect, it } from 'vitest'
import { failing, find, ids, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'ECON 1'],
  ['2270', 'MATH 19B', 'CSE 30', 'ECON 2', 'TIM 50'],
  ['2272', 'AM 30', 'CSE 12', 'ECON 10A', 'STAT 17', 'STAT 17L'],
  ['2278', 'AM 10', 'CSE 13S', 'CSE 16', 'TIM 58'],
  ['2280', 'AM 20', 'ECON 100A', 'CSE 150'],
  ['2282', 'ECON 113', 'CSE 182', 'TIM 170'],
  ['2288', 'TIM 172A', 'TIM 172P', 'CSE 101'],
  ['2290', 'TIM 172B', 'TIM 172Q', 'STAT 131'],
  ['2292', 'TIM 175', 'ECON 136'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('technology-and-information-management-bs 2025-26', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('letter grades required', () => {
    expect(find(run(harness, { terms: base, grades: { 'ECON 2': 'P' } }), 'econ-ld').status).toBe('unmet')
  })

  it('STAT 17L lab is required', () => {
    expect(find(run(harness, { terms: swap('STAT 17L') }), 'stats').status).toBe('unmet')
  })

  it('STAT 131 and CSE 107 cannot both be BE electives', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 107') }), 'be-electives').status).toBe('unmet')
  })

  it('BE electives: any 5-credit BE course 100–189 or 200–289 (AM, ECE, graduate CSE)', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'AM 114') }), 'be-electives').status).toBe('met')
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 240') }), 'be-electives').status).toBe('met')
  })

  it('BE electives: CSE 195 (190s), 2-credit courses and non-BE courses do not count', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 195') }), 'be-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 101', 'MATH 117') }), 'be-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 161L') }), 'be-electives').status).toBe('unmet')
  })

  it('a lecture with an associated lab needs the lab to count as a BE elective', () => {
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 161') }), 'be-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 101', 'CSE 161', 'CSE 161L') }), 'be-electives').status).toBe('met')
  })

  it('required upper-division courses do not double as BE electives', () => {
    expect(find(run(harness, { terms: swap('CSE 101') }), 'be-electives').status).toBe('unmet')
  })

  it('a TIM independent study counts as one BE elective with prior approval', () => {
    const t = swap('CSE 101', 'TIM 198')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'electives').status).toBe('needs-attestation')
    // two independent studies → only one counts
    expect(find(run(harness, { terms: swap('CSE 101', 'TIM 198', 'TIM 199').map((x) => ({ ...x, courses: x.courses.filter((c) => c !== 'STAT 131') })) }), 'be-electives').status).toBe('unmet')
    expect(ids(run(harness, { terms: base }))).not.toContain('attest:tim-independent-approval')
  })

  it('economics elective: a 5-credit ECON 100–189; ECON 100A/113 cannot double count', () => {
    expect(find(run(harness, { terms: swap('ECON 136') }), 'econ-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 100B') }), 'econ-elective').status).toBe('met')
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 195') }), 'econ-elective').status).toBe('unmet')
  })

  it('TIM 172A and 172P must be taken concurrently', () => {
    const t = base.map((x) => ({ ...x, courses: x.courses.filter((c) => c !== 'TIM 172P') }))
    t.push({ term: '2294', courses: ['TIM 172P'] })
    expect(find(run(harness, { terms: t }), 'comp-concurrent').status).toBe('unmet')
    expect(find(run(harness, { terms: t }), 'cse-ud').status).toBe('met')
  })

  it('DC needs TIM 175', () => {
    const r = run(harness, { terms: swap('TIM 175') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comp-tom').status).toBe('unmet')
  })

  it('MATH 20A/20B, MATH 22 or 23A, MATH 21, MATH 24 alternatives; ECON 100M', () => {
    const m: Record<string, string> = { 'MATH 19A': 'MATH 20A', 'MATH 19B': 'MATH 20B', 'AM 30': 'MATH 23A', 'AM 10': 'MATH 21', 'AM 20': 'MATH 24', 'ECON 100A': 'ECON 100M' }
    const t = base.map((x) => ({ ...x, courses: x.courses.map((c) => m[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('without CSE 20: the test-out attestation is asked; attested ⇒ met by test-out (§1a)', () => {
    expect(find(run(harness, { terms: swap('CSE 20'), attested: [] }), 'cse-ld/CSE20').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap('CSE 20'), attested: ['CSE 20 test-out'] }), 'cse-ld/CSE20').status).toBe('met')
  })

  it('review: a failed or P/NP CSE 20 is not rescued by the test-out', () => {
    expect(find(run(harness, { terms: base, grades: { 'CSE 20': 'F' } }), 'cse-ld/CSE20').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'CSE 20': 'P' } }), 'cse-ld/CSE20').status).toBe('unmet')
  })

  it('ECON 100M next to ECON 100A is not the economics elective (credit for only one)', () => {
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 100M') }), 'econ-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 136', 'ECON 100M') }), 'micro').status).toBe('met')
  })
})
