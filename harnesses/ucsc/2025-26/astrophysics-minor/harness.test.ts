import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'MATH 19A', 'PHYS 6A', 'PHYS 6L'],
  ['2270', 'MATH 19B', 'PHYS 6B', 'PHYS 6M'],
  ['2272', 'MATH 23A', 'PHYS 6C', 'PHYS 6N'],
  ['2278', 'PHYS 5D'],
  ['2280', 'PHYS 102', 'ASTR 119'],
  ['2282', 'ASTR 112', 'ASTR 113'],
  ['2288', 'EART 160'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('astrophysics-minor 2025-26', () => {
  it('complete record (PHYS 6 series + PHYS 5D)', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('PHYS 5D is required with the PHYS 6 series too', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 5D', null) }), 'physics').status).toBe('unmet')
  })

  it('PHYS 5 series with 15A/15C substitutions', () => {
    let t = base
    for (const [a, b] of [['PHYS 6A', 'PHYS 15A'], ['PHYS 6L', 'PHYS 5L'], ['PHYS 6B', 'PHYS 5B'], ['PHYS 6M', 'PHYS 5M'], ['PHYS 6C', 'PHYS 5C'], ['PHYS 6N', 'PHYS 5N']]) t = edit(t, a, b)
    expect(find(run(harness, { terms: t }), 'physics').status).toBe('met')
    expect(find(run(harness, { terms: edit(t, 'PHYS 5N', null) }), 'physics').status).toBe('unmet')
  })

  it('calculus: 19A+19B or 20A+20B (not mixed with MATH 11)', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 19A', 'MATH 20A'), 'MATH 19B', 'MATH 20B') }), 'calculus').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calculus').status).toBe('unmet')
  })

  it('only MATH 23A is required (no MATH 23B)', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 23A', 'MATH 23B') }), 'math23a').status).toBe('unmet')
  })

  it('four electives from the list', () => {
    expect(find(run(harness, { terms: edit(base, 'EART 160', null) }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'EART 160', 'PHYS 133') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'EART 160', 'PHYS 105') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'EART 160', 'PHYS 107') }), 'electives').status).toBe('met')
  })

  it('PHYS 102 is not an elective', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 102', null) }), 'phys102').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'ASTR 112': 'P', 'PHYS 102': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'ASTR 112': 'NP' } }), 'electives').status).toBe('unmet')
  })

  // --- review 2026-10-06: adversarial records ---
  const add = (t: StudentRecord['terms'], ...cs: string[]) => [...t, { term: '2300', courses: cs }]

  it('review: a retaken elective counts once', () => {
    expect(find(run(harness, { terms: add(edit(base, 'EART 160', null), 'ASTR 112') }), 'electives').status).toBe('unmet')
  })

  it('review: PHYS 5 lectures with PHYS 6 labs are not a package', () => {
    let t = base
    for (const [a, b] of [['PHYS 6A', 'PHYS 5A'], ['PHYS 6B', 'PHYS 5B'], ['PHYS 6C', 'PHYS 5C']]) t = edit(t, a, b)
    expect(find(run(harness, { terms: t }), 'physics').status).toBe('unmet')
  })

  it('review: calculus packages cannot be mixed (MATH 19A + 20B)', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 20B') }), 'calculus').status).toBe('unmet')
  })

  it('review: exam credit (no term) counts as the course', () => {
    const t = edit(edit(base, 'MATH 19A', null), 'MATH 19B', null)
    expect(failing(run(harness, { terms: t, completed: ['MATH 19A', 'MATH 19B'] }))).toEqual([])
  })

  it('review: ASTR 136 modules, ASTR 135 and other ASTR courses are not on the list', () => {
    expect(find(run(harness, { terms: add(edit(base, 'EART 160', null), 'ASTR 136A', 'ASTR 116', 'PHYS 135') }), 'electives').status).toBe('unmet')
  })

  it('review: kitchen sink completes; empty plan blames every requirement', () => {
    expect(failing(run(harness, { terms: add(base, 'MATH 20A', 'MATH 20B', 'PHYS 5A', 'PHYS 5L', 'PHYS 129', 'PHYS 171', 'AM 107') }))).toEqual([])
    expect(failing(run(harness, { terms: [] }))).toEqual(['calculus:unmet', 'math23a:unmet', 'physics:unmet', 'phys102:unmet', 'electives:unmet'])
  })
})
