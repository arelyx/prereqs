import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'EDUC 60', 'LALS 5'],
  ['2278', 'LALS 100', 'LALS 100A', 'LALS 100L'],
  ['2280', 'EDUC 110', 'EDUC 128'],
  ['2282', 'EDUC 141', 'EDUC 164', 'LALS 135'],
  ['2288', 'LALS 170', 'LALS 194H', 'LALS 194L'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studieseducation-democracy-and-justice-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('EDUC 180 instead of EDUC 110', () => {
    expect(failing(run(harness, { terms: swap('EDUC 110', 'EDUC 180') }))).toEqual([])
  })

  it('EDUC 110 and EDUC 180 together: one is required, the other an EDUC elective', () => {
    expect(failing(run(harness, { terms: swap('EDUC 164', 'EDUC 180') }))).toEqual([])
  })

  it('EDUC 110 cannot be both the required course and an elective', () => {
    expect(find(run(harness, { terms: swap('EDUC 164') }), 'educ-electives').status).toBe('unmet')
  })

  it('one elective must be taught in Spanish', () => {
    const r = run(harness, { terms: swap('LALS 135', 'LALS 143') })
    expect(find(r, 'lals-electives').status).toBe('met')
    expect(find(r, 'spanish').status).toBe('unmet')
  })

  it('LALS 157 and 183 are Spanish-taught too', () => {
    expect(find(run(harness, { terms: swap('LALS 135', 'LALS 183') }), 'spanish').status).toBe('met')
  })

  it('an outside Spanish-taught course needs advisor approval', () => {
    const t = swap('LALS 135', 'LALS 143', 'LIT 189A')
    expect(find(run(harness, { terms: t, attested: [] }), 'spanish').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t }), 'spanish').status).toBe('met')
  })

  it('LALS electives are 101-190: a senior seminar is not an elective', () => {
    expect(find(run(harness, { terms: swap('LALS 170', 'LALS 194A') }), 'lals-electives').status).toBe('unmet')
  })

  it('EDUC electives must be 102-187 (EDUC 190 does not count)', () => {
    expect(find(run(harness, { terms: swap('EDUC 164', 'EDUC 190') }), 'educ-electives').status).toBe('unmet')
  })

  it('comprehensive needs the senior seminar and its writing lab', () => {
    expect(find(run(harness, { terms: swap('LALS 194L') }), 'comprehensive').status).toBe('unmet')
  })

  it('grade below C does not count; P does', () => {
    expect(find(run(harness, { terms: base, grades: { 'EDUC 60': 'D' } }), 'educ60').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'EDUC 60': 'P' } }))).toEqual([])
  })

  it('DC needs LALS 100A and 100L', () => {
    expect(find(run(harness, { terms: swap('LALS 100L') }), 'dc').status).toBe('unmet')
  })
})

describe('latin-american-and-latino-studieseducation-democracy-and-justice-ba 2026-27 review (wave 2)', () => {
  it('CRES 121 [/EDUC 121] is an EDUC elective (cross-listed, same course)', () => {
    expect(failing(run(harness, { terms: swap('EDUC 164', 'CRES 121'), attested: [] }))).toEqual([])
  })

  // "Three 5-credit EDUC courses from 102-187."
  it('2- and 3-credit OAKS 151A/B [/EDUC 151A/B] are not 5-credit EDUC electives', () => {
    expect(find(run(harness, { terms: swap('EDUC 164', 'OAKS 151A') }), 'educ-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('EDUC 164', 'EDUC 151B') }), 'educ-electives').status).toBe('unmet')
  })

  // LALS B.A. page lists LALS 147 among "Courses taught primarily in Spanish"; this page does not.
  it('LALS 147 as the only possibly Spanish-taught course: cannot-check, not unmet', () => {
    const r = run(harness, { terms: swap('LALS 135', 'LALS 147') })
    expect(find(r, 'lals-electives').status).toBe('met')
    expect(find(r, 'spanish').status).toBe('cannot-check')
  })

  // "Pre-approved outside electives and study abroad courses taught in Spanish may be approved to satisfy the Spanish-language elective requirement."
  it('an approved outside Spanish-taught course in place of a LALS elective: cannot-check, not unmet', () => {
    const r = run(harness, { terms: swap('LALS 135', 'LIT 189A') })
    expect(find(r, 'spanish').status).toBe('met')
    expect(find(r, 'lals-electives').status).toBe('cannot-check')
    expect(find(run(harness, { terms: swap('LALS 135', 'LIT 189A'), attested: [] }), 'spanish').status).toBe('needs-attestation')
  })

  it('a LALS elective not on the Spanish list leaves the Spanish rule unmet (no outside candidate)', () => {
    const r = run(harness, { terms: swap('LALS 135', 'LALS 143') })
    expect(find(r, 'spanish').status).toBe('unmet')
  })

  it('EDUC 60 and the LALS intro cannot be EDUC/LALS electives; LALS 100 is not a LALS elective', () => {
    const r = run(harness, { terms: [...swap('LALS 170'), ...plan(['2290', 'LALS 100'])] })
    expect(find(r, 'lals-electives').status).toBe('unmet')
  })

  it('LALS 186 entered as SOCY 186 counts as a LALS elective', () => {
    expect(failing(run(harness, { terms: swap('LALS 170', 'SOCY 186') }))).toEqual([])
  })

  it('no-term credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: swap('EDUC 60'), completed: ['EDUC 60'] }))).toEqual([])
    const e = run(harness, { terms: [], attested: [] })
    expect(find(e, 'educ60').status).toBe('unmet')
    expect(find(e, 'spanish').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'EDUC 180', 'EDUC 10', 'LALS 1', 'LALS 10', 'LALS 157', 'LALS 183', 'LIT 189A', 'LALS 194A', 'EDUC 190'])]
    expect(failing(run(harness, { terms: sink, attested: [] }))).toEqual([])
  })
})
