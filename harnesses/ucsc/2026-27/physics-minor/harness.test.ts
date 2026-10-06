import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'PHYS 5A', 'PHYS 5L'],
  ['2270', 'MATH 19B', 'PHYS 5B', 'PHYS 5M'],
  ['2272', 'MATH 23A', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'MATH 23B', 'PHYS 5D'],
  ['2280', 'PHYS 102', 'PHYS 133'],
  ['2282', 'PHYS 105', 'PHYS 112'],
  ['2288', 'PHYS 115'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('physics-minor 2026-27', () => {
  it('complete record (all physics electives: no department needed)', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('PHYS 6 series with labs, plus PHYS 5D', () => {
    let t = base
    for (const [a, b] of [['PHYS 5A', 'PHYS 6A'], ['PHYS 5L', 'PHYS 6L'], ['PHYS 5B', 'PHYS 6B'], ['PHYS 5M', 'PHYS 6M'], ['PHYS 5C', 'PHYS 6C'], ['PHYS 5N', 'PHYS 6N']]) t = edit(t, a, b)
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: edit(t, 'PHYS 5D', null) }), 'phys5d').status).toBe('unmet')
  })

  it('PHYS 15A/15C substitute for 5A/5C; a missing lab fails the series', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'PHYS 5A', 'PHYS 15A'), 'PHYS 5C', 'PHYS 15C') }), 'physics-series').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 5M', null) }), 'physics-series').status).toBe('unmet')
  })

  it('P/NP grades are allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'PHYS 102': 'P', 'PHYS 115': 'P' } }))).toEqual([])
  })

  it('PHYS 102 and PHYS 133 are required and do not double as electives', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 133', null) }), 'ud-core').status).toBe('unmet')
    const r = run(harness, { terms: edit(base, 'PHYS 115', null) })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('PHYS electives must be 5 credits and in PHYS 100–180', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 115', 'PHYS 182') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 115', 'PHYS 135A') }), 'electives').status).toBe('unmet')
  })

  it('a listed outside elective needs the major department declared', () => {
    const t = edit(base, 'PHYS 115', 'ECE 101')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('cannot-check')
    expect(find(run(harness, { terms: t, choices: { 'major-dept': 'Mathematics' } }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: { 'major-dept': 'ECE' } }), 'electives').status).toBe('unmet')
  })

  it('an unlisted outside course does not count', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 115', 'ECE 174'), choices: { 'major-dept': 'other' } }), 'electives').status).toBe('unmet')
  })

  it('cross-listed elective EART 172 / OCEA 172 is blocked for either department', () => {
    const t = edit(base, 'PHYS 115', 'OCEA 172')
    expect(find(run(harness, { terms: t, choices: { 'major-dept': 'ocea' } }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: t, choices: { 'major-dept': 'other' } }), 'electives').status).toBe('met')
  })

  it('cross-listed physics courses are offered by the other department too', () => {
    // AM 107 / PHYS 107: fine for a math major, not for an applied math major, unknown without a department
    const t = edit(base, 'PHYS 115', 'PHYS 107')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('cannot-check')
    expect(find(run(harness, { terms: t, choices: { 'major-dept': 'Applied Mathematics' } }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: t, choices: { 'major-dept': 'Mathematics' } }), 'electives').status).toBe('met')
    // PHYS 150 is cross-listed as CSE 109
    expect(find(run(harness, { terms: edit(base, 'PHYS 115', 'PHYS 150'), choices: { 'major-dept': 'cse' } }), 'electives').status).toBe('unmet')
  })

  it('an extra physics course is preferred over an outside course', () => {
    const t = [...base, { term: '2290', courses: ['ECE 101'] }]
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
