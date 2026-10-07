import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// General Literature: electives cover Pre-1750 ×2 (110A, 114B), Global (124B),
// Poetry (110A), Research (119A).
const general = plan(
  ['2268', 'LIT 1', 'SPAN 1'],
  ['2270', 'LIT 61C', 'SPAN 2'],
  ['2272', 'SPAN 3', 'LIT 101'],
  ['2278', 'LIT 102', 'LIT 110A', 'LIT 114B'],
  ['2280', 'LIT 124B', 'LIT 119A', 'LIT 120C'],
  ['2282', 'LIT 133C', 'LIT 125H'],
  ['2288', 'LIT 190U'],
)
const G = { concentration: 'General Literature', intensive: 'false' }

describe('literature-ba 2025-26', () => {
  it('asks for a concentration first', () => {
    const r = run(harness, { terms: general })
    expect(r.nodes.map((n) => n.id)).toEqual(['choice:concentration'])
  })

  it('general literature complete', () => {
    expect(failing(run(harness, { terms: general, choices: G }))).toEqual([])
  })

  it('distribution: missing research is reported on its own', () => {
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 119A' ? 'LIT 125I' : c)) }))
    const r = run(harness, { terms: t, choices: G })
    expect(failing(r)).toEqual(['dist/Research:unmet'])
  })

  it('LIT 179A/B are creative-writing only', () => {
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 125H' ? 'LIT 179A' : c)) }))
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('unmet')
  })

  it('a LIT 182-189 course may replace LIT 102 but then is not an elective', () => {
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 102' ? 'LIT 182A' : c)) }))
    const r = run(harness, { terms: t, choices: G })
    expect(find(r, 'lit102').status).toBe('met')
    expect(find(r, 'electives').status).toBe('met')
    const t2 = t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LIT 125H') }))
    expect(find(run(harness, { terms: t2, choices: G }), 'electives').status).toBe('unmet')
  })

  it('language proficiency by exam is an attestation', () => {
    const t = general.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('SPAN')) }))
    expect(find(run(harness, { terms: t, choices: G, attested: [] }), 'language-proficiency').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices: G, attested: ['language proficiency exam'] }), 'language-proficiency').status).toBe('met')
  })

  it('intensive general needs two more non-English literature electives', () => {
    const r = run(harness, { terms: general, choices: { ...G, intensive: 'true' } })
    expect(find(r, 'intensive').status).toBe('unmet')
    const t = [...general, { term: '2290', courses: ['LIT 183A', 'LIT 185B'] }]
    expect(failing(run(harness, { terms: t, choices: { ...G, intensive: 'true' } }))).toEqual([])
  })

  it('2025-26: General Literature electives start at LIT 108', () => {
    // "chosen from LIT 108-189" (2026-27: LIT 109-189)
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 125H' ? 'LIT 108A' : c)) }))
    expect(failing(run(harness, { terms: t, choices: G }))).toEqual([])
  })

  it('2025-26: the DC is the senior seminar or thesis alone (LIT 101 not part of it)', () => {
    // "To satisfy the DC requirement students must complete a senior seminar series course or complete an independent senior thesis"
    const t = general.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LIT 101') }))
    const r = run(harness, { terms: t, choices: G })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'lit101').status).toBe('unmet')
    // no comprehensive → no DC
    const t2 = general.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LIT 190U') }))
    expect(find(run(harness, { terms: t2, choices: G }), 'dc').status).toBe('unmet')
  })

  it('2025-26: any LIT 190-series seminar is the senior seminar', () => {
    // "Students take one senior seminar. These are courses in the LIT 190 series."
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 190U' ? 'LIT 190X' : c)) }))
    expect(find(run(harness, { terms: t, choices: G }), 'comprehensive').status).toBe('met')
  })

  it('comprehensive must be letter graded', () => {
    expect(find(run(harness, { terms: general, choices: G, grades: { 'LIT 190U': 'P' } }), 'comprehensive').status).toBe('unmet')
  })

  it('language literature: five courses in the chosen language among the electives', () => {
    const t = plan(
      ['2268', 'LIT 1', 'SPAN 4'],
      ['2270', 'LIT 80B', 'SPAN 5'],
      ['2272', 'SPAN 6', 'LIT 101', 'LIT 102'],
      ['2278', 'LIT 110A', 'LIT 114B', 'LIT 119A'],
      ['2280', 'LIT 188A', 'LIT 188B', 'LIT 189E'],
      ['2282', 'LIT 189F'],
      ['2288', 'LIT 190U'],
    )
    const choices = { concentration: 'Language Literature', language: 'Spanish', intensive: 'false' }
    const r = run(harness, { terms: t, choices })
    expect(find(r, 'language-five').progress).toEqual({ have: 4, need: 5 })
    // LIT 190X counts toward the five
    const t2 = [...t, { term: '2290', courses: ['LIT 190X'] }]
    expect(find(run(harness, { terms: t2, choices }), 'language-five').status).toBe('met')
  })

  it('creative writing: three LIT 179 workshops, a CW senior seminar, admission', () => {
    const t = plan(
      ['2268', 'LIT 1', 'FREN 1', 'LIT 90'],
      ['2270', 'LIT 81A', 'FREN 2'],
      ['2272', 'FREN 3', 'LIT 101', 'LIT 102'],
      ['2278', 'LIT 110A', 'LIT 114B', 'LIT 119A'],
      ['2280', 'LIT 179A', 'LIT 124B'],
      ['2282', 'LIT 179A', 'LIT 179B'],
      ['2292', 'LIT 190W'],
    )
    const choices = { concentration: 'Creative Writing', track: 'poetry', intensive: 'false' }
    const r = run(harness, { terms: t, choices })
    expect(failing(r)).toEqual([])
    expect(find(run(harness, { terms: t, choices, attested: [] }), 'attest:cw-admission').status).toBe('needs-attestation')
    const t2 = t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 190W' ? 'LIT 190U' : c)) }))
    expect(find(run(harness, { terms: t2, choices }), 'comprehensive').status).toBe('unmet')
  })
})
