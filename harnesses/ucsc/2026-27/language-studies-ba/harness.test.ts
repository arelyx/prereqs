import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Spanish: SPAN 6, LING 50/53, SPAN 114 (advanced), LING 100/101/112,
// five electives (LING 113, 116, 117, SPAN 141, LING 171), capstone LING 190
// with LING 116 in the last quarter, a 10th upper-division course (LING 118).
const spanish = plan(
  ['2268', 'LING 50', 'SPAN 5'],
  ['2270', 'LING 53', 'SPAN 6'],
  ['2278', 'LING 100', 'SPAN 114'],
  ['2280', 'LING 101', 'LING 112'],
  ['2282', 'LING 113', 'SPAN 141'],
  ['2288', 'LING 117', 'LING 171', 'LING 118'],
  ['2290', 'LING 116', 'LING 190'],
)
const S = { concentration: 'Spanish' }
type T = typeof spanish
const swap = (t: T, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: T, term: string, ...cs: string[]) => [...t, { term, courses: cs }]

describe('language-studies-ba 2026-27', () => {
  it('complete Spanish record is met', () => {
    expect(failing(run(harness, { terms: spanish, choices: S }))).toEqual([])
  })

  it('asks for the language when the plan has several', () => {
    const r = run(harness, { terms: add(spanish, '2292', 'FREN 1') })
    expect(r.nodes.map((n) => n.id)).toEqual(['choice:concentration'])
    expect(failing(run(harness, { terms: add(spanish, '2292', 'FREN 1'), choices: { language: 'Spanish' } }))).toEqual([])
  })

  it('Level 6 or its equivalent (attestation)', () => {
    const t = swap(spanish, 'SPAN 6', null)
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'level6').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, choices: S, attested: ['placement'] }))).toEqual([])
  })

  it('LING 53 is required', () => {
    expect(failing(run(harness, { terms: swap(spanish, 'LING 53', null), choices: S }))).toEqual(['lower-ling/LING53:unmet'])
  })

  it('advanced language course must be in Spanish', () => {
    const t = swap(swap(spanish, 'SPAN 114', 'LING 119'), 'SPAN 141', 'LING 120')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['advanced:unmet'])
  })

  it('LIT 188/189 counts as the advanced course only after Level 6', () => {
    const t = swap(swap(spanish, 'SPAN 114', 'LIT 189F'), 'SPAN 141', 'LING 119')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual([])
    // LIT 189F taken in the same quarter as SPAN 6 → elective only
    const early = swap(t, 'LIT 189F', null).map((q) => (q.term === '2270' ? { ...q, courses: [...q.courses, 'LIT 189F'] } : q))
    expect(find(run(harness, { terms: early, choices: S }), 'advanced').status).toBe('unmet')
  })

  it('LING 111 or 112 is required, and does not count as an elective', () => {
    expect(find(run(harness, { terms: swap(spanish, 'LING 112', null), choices: S }), 'syntax').status).toBe('unmet')
    // both 111 and 112: the second is not an elective
    const t = swap(add(spanish, '2292', 'LING 111'), 'LING 118', null)
    const t2 = swap(t, 'LING 117', null)
    expect(find(run(harness, { terms: t2, choices: S }), 'electives').status).toBe('unmet')
  })

  it('five electives are required (French/Italian/Spanish)', () => {
    const t = swap(swap(spanish, 'LING 118', null), 'LING 117', null)
    expect(failing(run(harness, { terms: t, choices: S }))).toContain('electives:unmet')
  })

  it('LING 80-level courses do not count', () => {
    const t = swap(swap(spanish, 'LING 118', null), 'LING 117', 'LING 80K')
    expect(find(run(harness, { terms: t, choices: S }), 'electives').status).toBe('unmet')
  })

  it('a possible cultural context course is cannot-check, a misaligned language course is not a candidate', () => {
    const t = swap(swap(spanish, 'LING 118', null), 'LING 117', 'HIS 155')
    expect(find(run(harness, { terms: t, choices: S }), 'electives').status).toBe('cannot-check')
    const f = swap(swap(spanish, 'LING 118', null), 'LING 117', 'FREN 120')
    expect(find(run(harness, { terms: f, choices: S }), 'electives').status).toBe('unmet')
  })

  it('Chinese: two advanced language courses, the second is one of the five electives', () => {
    const t = plan(
      ['2268', 'LING 50', 'CHIN 5'],
      ['2270', 'LING 53', 'CHIN 6'],
      ['2278', 'LING 100', 'CHIN 103'],
      ['2280', 'LING 101', 'LING 112'],
      ['2282', 'LING 113', 'CHIN 104'],
      ['2288', 'LING 117', 'LING 171', 'LING 118'],
      ['2290', 'LING 116', 'LING 190'],
    )
    const C = { concentration: 'Chinese' }
    expect(failing(run(harness, { terms: t, choices: C }))).toEqual([])
    const one = swap(t, 'CHIN 104', 'LING 119')
    expect(failing(run(harness, { terms: one, choices: C }))).toEqual(['second-advanced:unmet'])
  })

  it('capstone: LING 190 must be concurrent with an upper-division linguistics elective', () => {
    const t = spanish.map((q) => (q.term === '2290' ? { ...q, courses: ['LING 190'] } : q.term === '2288' ? { ...q, courses: [...q.courses, 'LING 116'] } : q))
    const r = run(harness, { terms: t, choices: S })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('comprehensive must come after the DC (LING 101 + LING 111/112)', () => {
    const t = plan(
      ['2268', 'LING 50', 'SPAN 5'],
      ['2270', 'LING 53', 'SPAN 6'],
      ['2278', 'LING 100', 'SPAN 114', 'LING 116', 'LING 190'],
      ['2280', 'LING 101', 'LING 112'],
      ['2282', 'LING 113', 'SPAN 141'],
      ['2288', 'LING 117', 'LING 171', 'LING 118'],
    )
    const r = run(harness, { terms: t, choices: S })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('senior thesis option: LING 195 also counts as an elective; proposal approval is attested', () => {
    const t = swap(swap(spanish, 'LING 190', 'LING 195'), 'LING 116', null)
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual([])
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
  })

  it('LING 195 and LING 199 cannot both count as electives', () => {
    const t = swap(swap(swap(swap(spanish, 'LING 190', 'LING 195'), 'LING 116', 'LING 199'), 'LING 118', null), 'LING 117', null)
    expect(find(run(harness, { terms: t, choices: S }), 'electives').status).toBe('unmet')
  })

  it('graduate course option (by exception)', () => {
    const t = swap(swap(spanish, 'LING 190', null), 'LING 116', 'LING 211')
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual([])
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
  })

  it('nine upper-division courses plus LING 190: the 10-course minimum is left to the advisor', () => {
    const t = swap(spanish, 'LING 118', null)
    expect(failing(run(harness, { terms: t, choices: S }))).toEqual(['upper-count:cannot-check'])
  })

  it('Italian: ITAL 101 is not an advanced course but may be a cultural context elective', () => {
    const t = plan(
      ['2268', 'LING 50', 'ITAL 5'],
      ['2270', 'LING 53', 'ITAL 6'],
      ['2278', 'LING 100', 'ITAL 101'],
      ['2280', 'LING 101', 'LING 112'],
      ['2282', 'LING 113', 'LING 119'],
      ['2288', 'LING 117', 'LING 171', 'LING 118'],
      ['2290', 'LING 116', 'LING 190'],
    )
    const r = run(harness, { terms: t, choices: { concentration: 'Italian' } })
    expect(find(r, 'advanced').status).toBe('unmet')
    const t2 = swap(swap(t, 'LING 118', null), 'LING 119', 'ITAL 100')
    const r2 = run(harness, { terms: t2, choices: { concentration: 'Italian' } })
    expect(find(r2, 'advanced').status).toBe('met')
    expect(find(r2, 'electives').status).toBe('cannot-check')
  })

  it('LIT course with Level 6 tested out counts as advanced', () => {
    const t = swap(swap(swap(swap(spanish, 'SPAN 6', null), 'SPAN 5', null), 'SPAN 114', 'LIT 189F'), 'SPAN 141', 'LING 119')
    expect(find(run(harness, { terms: t, choices: S, attested: ['tested out of level 6'] }), 'advanced').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: S, attested: [] }), 'advanced').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: spanish, choices: S, grades: { 'LING 101': 'P', 'SPAN 114': 'P' } }))).toEqual([])
  })
})
