import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2025 (2025-26 catalog: CHEM 3BL/3CL always required).
const base = plan(
  ['2258', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2260', 'BIOE 20B', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B', 'BIOL 20L'],
  ['2262', 'BIOE 20C', 'CHEM 3C', 'CHEM 3CL', 'STAT 7', 'STAT 7L'],
  ['2268', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2270', 'CHEM 8B', 'PHYS 6B'],
  ['2272', 'PHYS 6C', 'BIOL 100'],
  ['2278', 'BIOL 101', 'BIOL 101L', 'BIOL 105'],
  ['2280', 'BIOE 107', 'BIOE 109', 'BIOL 110'],
  ['2282', 'BIOL 105L', 'BIOE 112', 'BIOE 112L'],
  ['2288', 'METX 100'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('biology-bs 2025-26', () => {
  it('complete record (BIOL 105L is the additional lab, DC and comprehensive)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('2025-26: CHEM 3BL and 3CL are required with CHEM 3B/3C whatever the term', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
    const late = base.map((q) => ({ ...q, term: String(Number(q.term) + 10) })) // fall 2026 start
    expect(find(run(harness, { terms: edit(edit(late, 'CHEM 3BL', null), 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: prior CHEM 1A, 1B, 1C and 1N satisfy general chemistry; 1M is not required', () => {
    const noThree = ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'].reduce((t, c) => edit(t, c, null), base)
    expect(find(run(harness, { terms: noThree }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: noThree, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'] }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: noThree, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1M'] }), 'gen-chem').status).toBe('unmet')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(t, 'BIOE 20C', 'BIOE 20C') .map((q) => q.term === '2262' ? { ...q, courses: [...q.courses, 'CHEM 4BL'] } : q) }), 'gen-chem').status).toBe('met')
  })

  it('a MATH 11/19 transition is accepted; MATH 16 mixing is not', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calc').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 16B') }), 'calc').status).toBe('unmet')
  })

  it('an elective lecture whose lab follows it in the list needs the lab', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 112L', null) })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('the additional lab must differ from the first lab', () => {
    // Only BIOL 101L as a lab course: it cannot fill both slots.
    const t = edit(edit(edit(base, 'BIOL 105L', null), 'BIOE 112L', null), 'BIOE 112', 'BIOL 112')
    const r = run(harness, { terms: t })
    // BIOL 101L can fill only one of the two lab slots
    expect([find(r, 'lab1').status, find(r, 'lab2').status].sort()).toEqual(['met', 'unmet'])
    expect(r.status).toBe('unmet')
  })

  it('DC via two BIOE courses; a paired 2-credit lab must be concurrent', () => {
    const noBiolDc = edit(base, 'BIOL 105L', 'BIOE 128L')
    const r = run(harness, { terms: noBiolDc })
    expect(find(r, 'dc-biol').status).toBe('unmet')
    expect(find(r, 'dc-bioe').status).toBe('unmet') // only BIOE 128L from the group
    const two = noBiolDc.map((q) => (q.term === '2288' ? { ...q, courses: [...q.courses, 'BIOE 114', 'BIOE 114L'] } : q))
    expect(find(run(harness, { terms: two }), 'dc').status).toBe('met')
    const split = noBiolDc.map((q) =>
      q.term === '2288' ? { ...q, courses: [...q.courses, 'BIOE 114'] } : q.term === '2282' ? { ...q, courses: [...q.courses, 'BIOE 114L'] } : q,
    )
    expect(find(run(harness, { terms: split }), 'dc-bioe').status).toBe('unmet')
  })

  it('letter grades are required', () => {
    const r = run(harness, { terms: base, grades: { 'BIOL 100': 'P' } })
    expect(find(r, 'ud-core').status).toBe('unmet')
  })

  it('2025-26: STAT 5 alone is a listed statistics option (no advisor waiver)', () => {
    const t = edit(edit(base, 'STAT 7', 'STAT 5'), 'STAT 7L', null)
    expect(find(run(harness, { terms: t, attested: [] }), 'stats').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'stats').status).toBe('unmet')
  })

  it('2025-26: METX 100L is not a first-lab option', () => {
    const t = edit(base, 'BIOL 101L', 'METX 100L')
    expect(find(run(harness, { terms: t }), 'lab1').status).toBe('unmet')
  })

  it('a lab counted for the additional lab cannot also complete an elective pair', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 105L', null) })
    // BIOL 101L and BIOE 112L cannot cover lab1, lab2 and the BIOE 112 elective pair at once
    const st = ['lab1', 'lab2', 'electives'].map((id) => find(r, id).status)
    expect(st.filter((x) => x === 'met')).toHaveLength(2)
  })

  it('three electives exclude required upper-division courses', () => {
    const r = run(harness, { terms: edit(base, 'METX 100', 'BIOL 100') })
    expect(find(r, 'electives').status).toBe('unmet')
  })
})
