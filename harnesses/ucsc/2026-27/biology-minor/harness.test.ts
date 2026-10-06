import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A'],
  ['2270', 'BIOE 20B', 'CHEM 3B'],
  ['2272', 'CHEM 3C'],
  ['2278', 'CHEM 8A'],
  ['2280', 'CHEM 8B'],
  ['2288', 'BIOL 100', 'BIOE 107'],
  ['2290', 'BIOL 105', 'BIOE 109'],
  ['2292', 'BIOL 110'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('biology-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('missing CHEM 3C (all three general chemistry courses required)', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3C', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('CHEM 4A/4B is not listed as an alternative', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', null)
    expect(run(harness, { terms: t }).status).toBe('unmet')
  })

  it('letter grade required', () => {
    const r = run(harness, { terms: base, grades: { 'BIOE 109': 'P' } })
    expect(find(r, 'ud-core').status).toBe('unmet')
  })

  it('elective must be 5+ credits (2-credit lab does not count)', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', 'BIOL 101L') }), 'ud-elective').status).toBe('unmet')
  })

  it('elective range ends at 181 (BIOL 186L does not count; BIOE 175 does)', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', 'BIOL 186L') }), 'ud-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', 'BIOE 175') }), 'ud-elective').status).toBe('met')
  })

  it('a core course cannot double as the elective', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', null) }), 'ud-elective').status).toBe('unmet')
  })

  it('a lower-division or non-biology course is not an elective', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', 'METX 100') }), 'ud-elective').status).toBe('unmet')
  })

  it('exam credit (completed with no term) counts', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 20A', null), completed: ['BIOL 20A'] })
    expect(failing(r)).toEqual([])
  })
})
