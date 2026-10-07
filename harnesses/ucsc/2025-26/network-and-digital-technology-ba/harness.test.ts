import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'CSE 20', 'CSE 16'],
  ['2270', 'MATH 19B', 'CSE 30', 'AM 10', 'PHYS 5A', 'PHYS 5L'],
  ['2272', 'CSE 12', 'AM 20', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'CSE 13S', 'AM 30', 'CSE 101'],
  ['2280', 'CSE 150', 'CSE 185E', 'CSE 130'],
  ['2282', 'CSE 156', 'CSE 156L', 'CSE 183'],
  ['2288', 'CSE 180', 'CSE 118'],
)
const swap = (from: string, to: string[]) => base.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('network-and-digital-technology-ba 2025-26', () => {
  it('complete record is met (CSE 156/156L is an elective and the comprehensive course)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('five electives are required', () => {
    expect(failing(run(harness, { terms: swap('CSE 118', []) }))).toEqual(['electives:unmet'])
  })

  it('CSE 115A satisfies the comprehensive requirement and is one of the five electives', () => {
    // "This course can count as one of the five required electives."
    const r0 = run(harness, { terms: swap('CSE 118', ['CSE 115A']) })
    expect(find(r0, 'electives').status).toBe('met')
    const t = swap('CSE 156', ['CSE 115A']).map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'CSE 156L' ? 'CSE 117' : c === 'CSE 183' ? 'CSE 119' : c)) }))
    const r = run(harness, { terms: t })
    expect(failing(r)).toEqual([])
    expect(find(r, 'comp-course').used?.map((e) => e.display)).toEqual(['CSE 115A'])
  })

  it('no credit for both CSE 180 and CSE 182', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 182']) }), 'electives').status).toBe('unmet')
  })

  it('an elective with an associated lab needs the lab', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 151']) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 151', 'CSE 151L']) }), 'electives').status).toBe('met')
  })

  it('2025-26: electives come from the two focus lists (or the external list), not any CSE 100–189 / 201–279', () => {
    // CSE 120 is not on a focus list: it may be on the external approved list → cannot-check until declared
    const r = run(harness, { terms: swap('CSE 118', ['CSE 120']) })
    expect(find(r, 'electives').status).toBe('cannot-check')
    expect(failing(run(harness, { terms: swap('CSE 118', ['CSE 120']), choices: { 'approved-electives': 'CSE 120' } }))).toEqual([])
    // a graduate course is not an upper-division elective here
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 210A']) }), 'electives').status).toBe('unmet')
    // CSE 115A (a DC course excluded in 2026-27) is on the Internet Software Technology list
    expect(find(run(harness, { terms: swap('CSE 118', ['CSE 115A']) }), 'electives').status).toBe('met')
  })

  it('a non-CSE upper-division course might be on the external approved list: cannot-check', () => {
    expect(find(run(harness, { terms: swap('CSE 118', ['ECE 171']) }), 'electives').status).toBe('cannot-check')
  })

  it('no comprehensive course: needs the petition, else unmet', () => {
    // CSE 156/156L and CSE 183 → CSE 130-like electives not on the comprehensive list
    const t = swap('CSE 156', ['CSE 117']).map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 156L' ? [] : c === 'CSE 183' ? ['CSE 119'] : [c])) }))
    const r = run(harness, { terms: t, attested: [] })
    expect(find(r, 'comprehensive').status).toBe('needs-attestation')
    expect(find(r, 'comp-course').status).toBe('unmet')
  })

  it('2025-26: CSE 101 is required; ECE 101 + 101L is not an alternative', () => {
    expect(failing(run(harness, { terms: swap('CSE 101', ['ECE 101', 'ECE 101L']) }))).toEqual(['cse101:unmet'])
  })

  it('CSE 185E is required (and is the DC course)', () => {
    const r = run(harness, { terms: swap('CSE 185E', []) })
    expect(failing(r)).toEqual(['cse185:unmet', 'dc:unmet'])
  })

  it('PHYS 6A/6L alternative; lab required with lecture', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.map((c) => ({ 'PHYS 5A': 'PHYS 6A', 'PHYS 5L': 'PHYS 6L' })[c] ?? c) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(failing(run(harness, { terms: swap('PHYS 5L', []) }))).toEqual(['phys-a:unmet'])
  })

  it('2025-26: no PHYS 15A / 15C substitution', () => {
    expect(failing(run(harness, { terms: swap('PHYS 5C', ['PHYS 15C']) }))).toEqual(['phys-c:unmet'])
    expect(failing(run(harness, { terms: swap('PHYS 5A', ['PHYS 15A']) }))).toEqual(['phys-a:unmet'])
  })

  it('CSE 20 test-out (review: §1a): attestation offered only when CSE 20 is absent', () => {
    expect(failing(run(harness, { terms: swap('CSE 20', []) }))).toEqual([])
    expect(failing(run(harness, { terms: swap('CSE 20', []), attested: [] }))).toEqual(['cse20:needs-attestation'])
    expect(failing(run(harness, { terms: base, grades: { 'CSE 20': 'F' } }))).toEqual(['cse20:unmet'])
  })

  it('letter grades required', () => {
    expect(find(run(harness, { terms: base, grades: { 'CSE 150': 'P' } }), 'cse150').status).toBe('unmet')
  })

  it('2025-26: ECE courses are not comprehensive courses (and are electives only via the external list)', () => {
    const noComp = swap('CSE 156', ['CSE 117']).map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'CSE 156L' ? [] : c === 'CSE 183' ? ['ECE 171', 'ECE 171L'] : [c])) }))
    const r = run(harness, { terms: noComp, attested: [], choices: { 'approved-electives': 'ECE 171' } })
    expect(find(r, 'electives').status).toBe('met')
    expect(find(r, 'comp-course').status).toBe('unmet')
    expect(find(run(harness, { terms: noComp }), 'electives').status).toBe('cannot-check')
  })

  it('review: approved-list electives are declared by the student; until then cannot-check', () => {
    const t = swap('CSE 118', ['LING 112'])
    const r = run(harness, { terms: t })
    expect(find(r, 'electives').status).toBe('cannot-check')
    expect(find(r, 'electives').choice).toBe('approved-electives')
    expect(failing(run(harness, { terms: t, choices: { 'approved-electives': 'LING 112' } }))).toEqual([])
    expect(find(run(harness, { terms: t, choices: { 'approved-electives': 'ECON 101' } }), 'electives').status).toBe('unmet')
  })

  it('review: CSE 185S is CSE 185E (cross-listed); CSE 185E is not also an elective', () => {
    expect(failing(run(harness, { terms: swap('CSE 185E', ['CSE 185S']) }))).toEqual([])
    expect(find(run(harness, { terms: swap('CSE 118', []) }), 'electives').status).toBe('unmet')
  })
})
