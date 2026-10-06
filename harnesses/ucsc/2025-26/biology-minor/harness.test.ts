import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2258', 'BIOL 20A', 'CHEM 3A'],
  ['2260', 'BIOE 20B', 'CHEM 3B'],
  ['2262', 'CHEM 3C', 'BIOL 20L'],
  ['2268', 'CHEM 8A'],
  ['2270', 'CHEM 8B'],
  ['2278', 'BIOL 100', 'BIOE 107'],
  ['2280', 'BIOL 105', 'BIOE 109'],
  ['2282', 'BIOL 110'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('biology-minor 2025-26', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('missing CHEM 3C (all three general chemistry courses required)', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3C', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: BIOL 20L is required', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 20L', null) }), 'ld-core').status).toBe('unmet')
  })

  it('2025-26: prior CHEM 1A, 1B and 1C satisfy general chemistry (no lab named)', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', null), 'CHEM 3B', null), 'CHEM 3C', null)
    expect(find(run(harness, { terms: t, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C'] }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: t, completed: ['CHEM 1A', 'CHEM 1B'] }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: CHEM 3BL/3CL are not required (not listed)', () => {
    expect(find(run(harness, { terms: base }), 'gen-chem').status).toBe('met')
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

  // --- adversarial review 2026-10-06 ---
  describe('review 2026-10-06', () => {
    const el = (code: string) => find(run(harness, { terms: edit(base, 'BIOL 110', code) }), 'ud-elective').status

    it('a 5-credit upper-division lab in range (BIOL 100L, BIOE 128L) is an elective', () => {
      // "one upper-division elective of five credits or more chosen from BIOE 100-BIOE 181 or BIOL 100-BIOL 181"
      expect(el('BIOL 100L')).toBe('met')
      expect(el('BIOE 128L')).toBe('met')
    })

    it('BIOE 106 is not a minor core course, so it may be the elective', () => {
      expect(el('BIOE 106')).toBe('met')
    })

    it('under-5-credit courses in range (BIOL 124, BIOE 182F) are not electives', () => {
      expect(el('BIOL 124')).toBe('unmet')
      expect(el('BIOE 182F')).toBe('unmet')
    })

    it('P in a lower-division course fails the letter-grade rule; detail names it', () => {
      const r = run(harness, { terms: base, grades: { 'CHEM 3A': 'P' } })
      expect(find(r, 'gen-chem').status).toBe('unmet')
      expect(r.status).toBe('unmet')
    })

    it('a failing grade does not count (F in CHEM 8A)', () => {
      expect(find(run(harness, { terms: base, grades: { 'CHEM 8A': 'F' } }), 'ld-core').status).toBe('unmet')
    })

    it('a planned elective is in progress, not met', () => {
      const r = run(harness, { terms: base, currentTerm: '2282' })
      expect(find(r, 'ud-elective').status).toBe('in-progress')
    })

    it('transfer/exam credit with no term for all general chemistry counts', () => {
      const t = edit(edit(edit(base, 'CHEM 3A', null), 'CHEM 3B', null), 'CHEM 3C', null)
      expect(failing(run(harness, { terms: t, completed: ['CHEM 3A', 'CHEM 3B', 'CHEM 3C'] }))).toEqual([])
    })

    it('two core-course duplicates do not make an elective (BIOL 100 twice)', () => {
      expect(find(run(harness, { terms: edit(base, 'BIOL 110', 'BIOL 100') }), 'ud-elective').status).toBe('unmet')
    })

    it('empty plan fails', () => {
      expect(run(harness, { terms: [] }).status).toBe('unmet')
    })

    it('kitchen sink with extra courses is complete', () => {
      const t = [...base, { term: '2284', courses: ['BIOE 175', 'CHEM 4A', 'BIOL 186L', 'BIOE 20C'] }]
      expect(failing(run(harness, { terms: t }))).toEqual([])
    })
  })
})
