import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'GREE 1', 'HIS 62A'],
  ['2270', 'GREE 2'],
  ['2278', 'LIT 184A', 'HIS 160A'],
  ['2280', 'LIT 184B', 'PHIL 100A', 'HAVC 151'],
  ['2282', 'LIT 184C', 'LIT 121A'],
  ['2288', 'HIS 161B'],
  ['2290', 'LIT 125A', 'ANCS 197F'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => base.map((t) => ({ ...t, courses: t.courses.filter((c) => c !== code) }))

describe('ancient-studies-ba 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('Latin sequence works in place of Greek', () => {
    const t = swap('GREE 1', 'LATN 1').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'GREE 2' ? 'LATN 2' : c)) }))
    expect(find(run(harness, { terms: t }), 'language').status).toBe('met')
  })

  it('one quarter of each language is not the sequence', () => {
    expect(find(run(harness, { terms: swap('GREE 2', 'LATN 1') }), 'language').status).toBe('unmet')
  })

  it('survey must come from the list', () => {
    expect(find(run(harness, { terms: swap('HIS 62A', 'HIS 70A') }), 'survey').status).toBe('unmet')
  })

  it('only two Greek/Latin literature courses: an elective cannot stand in', () => {
    const r = run(harness, { terms: swap('LIT 184C', 'LIT 130A') })
    expect(find(r, 'greek-latin').status).toBe('unmet')
  })

  it('extra Greek/Latin courses count as electives (the list repeats them)', () => {
    const t = swap('HIS 161B', 'LIT 186A')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('five electives are not six', () => {
    expect(find(run(harness, { terms: drop('LIT 125A') }), 'electives').status).toBe('unmet')
  })

  it('unlisted upper-division courses are not electives', () => {
    expect(find(run(harness, { terms: swap('LIT 125A', 'HIS 172A') }), 'electives').status).toBe('unmet')
  })

  it('DC needs two of LIT 184B–E / 186B–D: 184A and 186A do not count', () => {
    const t = swap('LIT 184C', 'LIT 186A')
    const r = run(harness, { terms: t })
    expect(find(r, 'greek-latin').status).toBe('met')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('the CLST 197F / ANCS 197F seminar is required', () => {
    expect(find(run(harness, { terms: drop('ANCS 197F') }), 'ancs197f').status).toBe('unmet')
  })

  it('the comprehensive examination is an attestation', () => {
    const r = run(harness, { terms: base, attested: [] })
    expect(find(r, 'attest:comprehensive-exam').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: base, attested: ['senior comprehensive examination'] }))).toEqual([])
  })

  it('two P/NP requirements are fine; three are not', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HIS 62A': 'P', 'HAVC 151': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'HIS 62A': 'P', 'HAVC 151': 'P', 'LIT 121A': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })

  it('a repeatable Greek course taken twice counts twice', () => {
    const t = swap('LIT 184C', 'LIT 184B')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})

describe('ancient-studies-ba 2025-26 (more)', () => {
  it('the cross-listed LGST 105A counts like POLI 105A', () => {
    expect(failing(run(harness, { terms: swap('LIT 125A', 'LGST 105A') }))).toEqual([])
  })
  it('review: the cross-listed HIS 159M counts like LIT 159M (library cross-listing, no partner list)', () => {
    expect(failing(run(harness, { terms: swap('LIT 125A', 'HIS 159M') }))).toEqual([])
  })

  it('review: no elementary language in the plan asks for the faculty determination (or equivalent)', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('GREE')) }))
    expect(find(run(harness, { terms: t, attested: [] }), 'attest:language-equivalent').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['language-equivalent'] }), 'language-or-equivalent').status).toBe('met')
  })

  it('review: with the sequence in the plan the determination is not asked', () => {
    expect(() => find(run(harness, { terms: base, attested: [] }), 'attest:language-equivalent')).toThrow()
  })

  it('review: LIT 186A (an introduction) does not count toward DC', () => {
    const t = swap('LIT 184B', 'LIT 186A')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
  })

  it('review: a lower-division survey cannot fill an upper-division elective', () => {
    expect(find(run(harness, { terms: swap('LIT 125A', 'HIS 61') }), 'electives').status).toBe('unmet')
  })

  it('2025-26: the seminar is CLST 197F (the renumbered ANCS 197F also counts)', () => {
    expect(failing(run(harness, { terms: swap('ANCS 197F', 'CLST 197F') }))).toEqual([])
    expect(find(run(harness, { terms: base }), 'ancs197f').status).toBe('met')
  })

  it('2025-26: LIT 190T is an elective', () => {
    expect(failing(run(harness, { terms: swap('HIS 161B', 'LIT 190T') }))).toEqual([])
  })

  it('2025-26: LIT 116C is not an elective', () => {
    expect(find(run(harness, { terms: swap('HIS 161B', 'LIT 116C') }), 'electives').status).toBe('unmet')
  })
})
