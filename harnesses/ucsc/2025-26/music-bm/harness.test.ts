import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// A frosh pianist: B.M. from Winter of year 1 (first lesson), 11 program quarters.
const terms = plan(
  ['2268', 'MUSC 30A', 'MUSC 31', 'MUSC 2'],
  ['2270', 'MUSC 30B', 'MUSC 31', 'MUSC 2', 'MUSC 61'],
  ['2272', 'MUSC 30C', 'MUSC 31', 'MUSC 2', 'MUSC 61', 'MUSC 60'],
  ['2278', 'MUSC 101A', 'MUSC 102', 'MUSC 161'],
  ['2280', 'MUSC 101B', 'MUSC 102', 'MUSC 161'],
  ['2282', 'MUSC 101C', 'MUSC 102', 'MUSC 161'],
  ['2288', 'MUSC 101F', 'MUSC 165', 'MUSC 161'],
  ['2290', 'MUSC 105A', 'MUSC 165', 'MUSC 161'],
  ['2292', 'MUSC 150H', 'MUSC 165', 'MUSC 161'],
  ['2298', 'MUSC 150A', 'MUSC 164', 'MUSC 162'],
  ['2300', 'MUSC 164', 'MUSC 162'],
  ['2302', 'MUSC 164', 'MUSC 196B'],
)
const choices = { instrument: 'piano', entry: 'frosh' }

describe('music-bm 2025-26', () => {
  it('complete frosh record', () => {
    const r = run(harness, { terms, choices })
    expect(failing(r)).toEqual([])
  })

  it('2025-26: all of MUSC 101A/B/C are required', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MUSC 101B' ? 'MUSC 101G' : c)) }))
    expect(find(run(harness, { terms: t, choices }), 'core-history').status).toBe('unmet')
  })

  it('2025-26: MUSC 150H is required; MUSC 10 is not an ensemble', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MUSC 150H' ? 'MUSC 150C' : c)) }))
    expect(find(run(harness, { terms: t, choices }), 'core-theory').status).toBe('unmet')
    const t2 = terms.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'MUSC 165' ? 'MUSC 10' : c)) }))
    expect(find(run(harness, { terms: t2, choices }), 'ensembles').status).toBe('unmet')
  })

  it('2025-26: MUSC 60 may be waived (attestation)', () => {
    const t = terms.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'MUSC 60') }))
    expect(find(run(harness, { terms: t, choices, attested: [] }), 'musc60').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices }), 'musc60').status).toBe('met')
  })

  it('a program quarter without an ensemble fails, even if 9 quarters exist overall', () => {
    const t = terms.map((q) => (q.term === '2290' ? { ...q, courses: q.courses.filter((c) => c !== 'MUSC 165') } : q))
    const n = find(run(harness, { terms: t, choices }), 'ensembles')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/Winter 2029/)
  })

  it('two ensembles in one quarter count once', () => {
    // 9 program quarters, but quarter count from ensembles counts each quarter once
    const short = plan(
      ['2270', 'MUSC 2', 'MUSC 3', 'MUSC 61'],
      ['2272', 'MUSC 2', 'MUSC 61'],
    )
    const n = find(run(harness, { terms: short, choices }), 'ensembles')
    expect(n.progress).toEqual({ have: 2, need: 9, unit: 'quarters' })
  })

  it('transfer needs six quarters', () => {
    const t = terms.slice(6)
    const r = run(harness, { terms: [...terms.slice(0, 3).map((q) => ({ ...q, courses: q.courses.filter((c) => !/MUSC (2|61)$/.test(c)) })), ...t], choices: { instrument: 'violin', entry: 'transfer' } })
    expect(find(r, 'ensembles').status).toBe('met')
    expect(find(r, 'lessons').status).toBe('met')
  })

  it('voice students need FREN 1 and ITAL 1', () => {
    const r = run(harness, { terms, choices: { instrument: 'voice', entry: 'frosh' } })
    expect(find(r, 'language').status).toBe('unmet')
    const withLang = [...terms, { term: '2304', courses: ['FREN 1', 'GERM 1', 'ITAL 1'] }]
    expect(find(run(harness, { terms: withLang, choices: { instrument: 'soprano', entry: 'frosh' } }), 'language').status).toBe('met')
  })

  it('juries are an attestation', () => {
    const r = run(harness, { terms, choices, attested: ['senior recital'] })
    expect(find(r, 'attest:juries').status).toBe('needs-attestation')
    expect(find(r, 'attest:senior-recital').status).toBe('met')
  })

  it('upper-division courses need letter grades except ensembles', () => {
    const r = run(harness, { terms, choices, grades: { 'MUSC 150A': 'P', 'MUSC 165': 'P', 'MUSC 30A': 'P' } })
    expect(find(r, 'theory-ud').status).toBe('unmet')
    expect(find(r, 'ensembles').status).toBe('met')
    expect(find(r, 'theory-ld').status).toBe('met')
  })

  it('2025-26: three MUSC 31 sections, no failed-section exception', () => {
    const t = terms.map((q) => (q.term === '2270' ? { ...q, courses: q.courses.filter((c) => c !== 'MUSC 31') } : q))
    expect(find(run(harness, { terms: t, choices }), 'musc31').status).toBe('unmet')
  })

  it('missing entry type asks for a choice', () => {
    const r = run(harness, { terms, choices: { instrument: 'piano' } })
    expect(find(r, 'ensembles').status).toBe('needs-choice')
  })
})
