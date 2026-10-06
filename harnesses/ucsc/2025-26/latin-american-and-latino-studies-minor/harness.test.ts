import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LALS 10', 'LALS 80F'],
  ['2278', 'LALS 100'],
  ['2280', 'LALS 113', 'LALS 143'],
  ['2282', 'LALS 170', 'LALS 181'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studies-minor 2025-26', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('core may be LALS 100A with its lab instead of LALS 100', () => {
    expect(find(run(harness, { terms: swap('LALS 100', 'LALS 100A', 'LALS 100L') }), 'core').status).toBe('met')
    expect(find(run(harness, { terms: swap('LALS 100', 'LALS 100A') }), 'core').status).toBe('unmet')
  })

  it('the other core course can be one of the four electives', () => {
    const r = run(harness, { terms: swap('LALS 181', 'LALS 100A', 'LALS 100L') })
    expect(failing(r)).toEqual([])
  })

  it('a senior seminar can be an elective', () => {
    expect(failing(run(harness, { terms: swap('LALS 181', 'LALS 194A') }))).toEqual([])
  })

  it('four electives are needed', () => {
    expect(find(run(harness, { terms: swap('LALS 181') }), 'ud-electives').status).toBe('unmet')
  })

  it('LALS 194L (2 credits) is not an elective', () => {
    expect(find(run(harness, { terms: swap('LALS 181', 'LALS 194L') }), 'ud-electives').status).toBe('unmet')
  })

  it('the lower-division elective must be LALS 1-99, 5 credits; another intro course counts', () => {
    expect(find(run(harness, { terms: swap('LALS 80F', 'LALS 1') }), 'ld-elective').status).toBe('met')
    expect(find(run(harness, { terms: swap('LALS 80F', 'LALS 56L'), attested: [] }), 'ld-elective').status).toBe('needs-attestation')
  })

  it('P grades are allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'LALS 113': 'P', 'LALS 10': 'P' } }))).toEqual([])
  })

  it('an outside upper-division course may be pre-approved: cannot-check', () => {
    expect(find(run(harness, { terms: swap('LALS 181', 'HIS 140B') }), 'ud-electives').status).toBe('cannot-check')
  })

  it('outside courses are limited to two across the minor', () => {
    let t = swap('LALS 80F', 'HIS 10A')
    t = t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'LALS 181' ? ['HIS 140B'] : c === 'LALS 170' ? ['POLI 140C'] : [c])) }))
    // (attested: [] — with an AP Spanish attestation the lower-division slot would not need HIS 10A)
    const r = run(harness, { terms: t, attested: [] })
    expect(find(r, 'ud-electives').status).toBe('unmet')
  })
})

describe('latin-american-and-latino-studies-minor 2025-26 review (wave 2)', () => {
  // LALS B.A. Letter Grade Policy: "Major and minor requirements will be met with grades of C or better or Pass"
  it('a C- does not count toward the minor (C or better, or P)', () => {
    expect(find(run(harness, { terms: base, grades: { 'LALS 143': 'C-' } }), 'ud-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'LALS 10': 'D' } }), 'intro').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'LALS 143': 'C' } }))).toEqual([])
  })

  // "May also be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam."
  it('AP Spanish is asked only when the lower-division elective is missing', () => {
    const t = swap('LALS 80F')
    expect(find(run(harness, { terms: t, attested: [] }), 'ld-elective').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, attested: ['AP Spanish Literature and Culture'] }))).toEqual([])
    expect(failing(run(harness, { terms: base, attested: [] }))).toEqual([])
  })

  it('PHIL 80E (cross-listed LALS 80E) is a LALS lower-division elective', () => {
    expect(failing(run(harness, { terms: swap('LALS 80F', 'PHIL 80E'), attested: [] }))).toEqual([])
  })

  it('SOCY 186 is LALS 186 (cross-listed): counts as an elective without approval', () => {
    expect(failing(run(harness, { terms: swap('LALS 181', 'SOCY 186'), attested: [] }))).toEqual([])
  })

  it('LALS 100 cannot be both the core and an elective', () => {
    expect(find(run(harness, { terms: [...swap('LALS 181'), ...plan(['2290', 'LALS 100'])] }), 'ud-electives').status).toBe('unmet')
  })

  it('LALS 100L alone is neither core nor elective', () => {
    const r = run(harness, { terms: swap('LALS 100', 'LALS 100L') })
    expect(find(r, 'core').status).toBe('unmet')
  })

  it('independent study needs advisor approval: cannot-check', () => {
    expect(find(run(harness, { terms: swap('LALS 181', 'LALS 199') }), 'ud-electives').status).toBe('cannot-check')
  })

  it('empty plan and kitchen sink', () => {
    const e = run(harness, { terms: [], attested: [] })
    expect(find(e, 'intro').status).toBe('unmet')
    expect(find(e, 'ud-electives').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'LALS 1', 'LALS 5', 'LALS 100A', 'LALS 100L', 'LALS 194A', 'LALS 194L', 'HIS 140B'])]
    expect(failing(run(harness, { terms: sink, attested: [] }))).toEqual([])
  })

  it('no-term credit counts', () => {
    expect(failing(run(harness, { terms: swap('LALS 10'), completed: ['LALS 10'] }))).toEqual([])
  })
})
