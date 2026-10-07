import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2298', courses: cs }]

const base = plan(
  ['2268', 'PSYC 20', 'MATH 11A', 'LING 50'],
  ['2270', 'PSYC 2', 'CSE 20', 'PHIL 9'],
  ['2272', 'CMPM 80I'],
  ['2278', 'PSYC 100', 'PSYC 121'],
  ['2280', 'PSYC 123', 'PSYC 125'],
  ['2282', 'PSYC 124', 'PSYC 130'],
  ['2288', 'PSYC 139A', 'LING 171'],
)

describe('cognitive-science-bs 2025-26', () => {
  it('complete record (15 courses)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('core: three of the four areas', () => {
    expect(find(run(harness, { terms: edit(base, 'PSYC 125', null) }), 'core').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PSYC 125', 'PSYC 129') }), 'core').status).toBe('met')
  })

  it('a fourth core course may serve as a cognitive elective', () => {
    const t = edit(base, 'PSYC 130', 'PSYC 129')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('core courses cannot double as cognitive electives', () => {
    // only three core courses and one list course: cog-two lacks one
    const r = run(harness, { terms: edit(base, 'PSYC 130', null) })
    expect(find(r, 'cog-two').status).toBe('unmet')
  })

  it('only one of PSYC 193/193I/193S/194A/194B/195A', () => {
    const t = edit(edit(base, 'PSYC 124', 'PSYC 193'), 'PSYC 130', 'PSYC 195A')
    expect(find(run(harness, { terms: t }), 'cog-two').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PSYC 124', 'PSYC 193') }), 'cog-two').status).toBe('met')
  })

  it('graduate PSYC 204-252 by petition', () => {
    const t = edit(base, 'PSYC 130', 'PSYC 220')
    expect(find(run(harness, { terms: t }), 'cog-two').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'cog-two').status).toBe('needs-attestation')
  })

  it('a senior seminar is required (DC and comprehensive too)', () => {
    const r = run(harness, { terms: edit(base, 'PSYC 139A', 'PSYC 122') })
    expect(find(r, 'seminar').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('interdisciplinary: at least one must be upper-division', () => {
    const allLower = edit(base, 'LING 171', 'LING 80D')
    expect(find(run(harness, { terms: allLower }), 'interdisciplinary').status).toBe('unmet')
    expect(find(run(harness, { terms: add(allLower, 'LING 172') }), 'interdisciplinary').status).toBe('met')
  })

  it('2025-26: an additional upper-division PSYC course does not replace the upper-division interdisciplinary elective', () => {
    const allLower = edit(base, 'LING 171', 'LING 80D')
    expect(find(run(harness, { terms: add(allLower, 'PSYC 140F') }), 'interdisciplinary').status).toBe('unmet')
    expect(find(run(harness, { terms: add(allLower, 'PSYC 133') }), 'interdisciplinary').status).toBe('unmet')
  })

  it('2025-26: PSYC 160, PSYC 178 and PSYC 193S are not cognitive electives; LING 174 is not interdisciplinary', () => {
    for (const c of ['PSYC 160', 'PSYC 178', 'PSYC 193S'])
      expect(find(run(harness, { terms: edit(base, 'PSYC 130', c) }), 'cog-two').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'LING 171', 'LING 174') }), 'interdisciplinary').status).toBe('unmet')
  })

  it('four interdisciplinary electives are needed', () => {
    expect(find(run(harness, { terms: edit(base, 'PHIL 9', null) }), 'interdisciplinary').status).toBe('unmet')
  })

  it('a lecture with its lab is one interdisciplinary course; only the lecture is required', () => {
    const lecOnly = edit(base, 'LING 171', 'BIOE 124')
    expect(failing(run(harness, { terms: lecOnly }))).toEqual([])
    // BIOE 124 + 124L count as one course, not two
    const pair = add(edit(edit(base, 'LING 171', 'BIOE 124'), 'PHIL 9', null), 'BIOE 124L')
    expect(find(run(harness, { terms: pair }), 'interdisciplinary').status).toBe('unmet')
  })

  it('PHIL 190 by petition only', () => {
    const t = edit(base, 'LING 171', 'PHIL 190')
    expect(find(run(harness, { terms: t }), 'interdisciplinary').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'interdisciplinary').status).toBe('needs-attestation')
  })

  it('statistics: STAT 7 needs STAT 7L; P grades are accepted', () => {
    expect(find(run(harness, { terms: edit(base, 'PSYC 2', 'STAT 7') }), 'stats').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'PSYC 2': 'P', 'PSYC 121': 'P' } }))).toEqual([])
  })

  it('PSYC 100 is required', () => {
    const r = run(harness, { terms: edit(base, 'PSYC 100', null) })
    expect(find(r, 'psyc100').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('a second seminar is not a listed cognitive elective', () => {
    // 2025-26 has no "only one seminar" sentence, but seminars are not on the list
    const r = run(harness, { terms: edit(base, 'PSYC 130', 'PSYC 119A') })
    expect(find(r, 'cog-two').status).toBe('unmet')
  })

  it('PSYC 193I counts as a single elective', () => {
    const r = run(harness, { terms: edit(edit(base, 'PSYC 124', 'PSYC 193I'), 'PSYC 130', null) })
    expect(find(r, 'cog-two').status).toBe('unmet')
  })

  // review 2026-10-06
  it('CSE 20 test-out: offered only when no programming course is in the plan', () => {
    const t = edit(base, 'CSE 20', null)
    expect(find(run(harness, { terms: t }), 'programming-testout').status).toBe('met')
    expect(find(run(harness, { terms: t, attested: [] }), 'programming-or-testout').status).toBe('needs-attestation')
    expect(() => find(run(harness, { terms: base, attested: [] }), 'programming-or-testout')).toThrow()
  })

  // "LING 111 formerly LING 55LING 112 formerly LING 52"
  it('former code LING 55 counts as an interdisciplinary elective', () => {
    expect(failing(run(harness, { terms: edit(base, 'PHIL 9', 'LING 55') }))).toEqual([])
  })
})
