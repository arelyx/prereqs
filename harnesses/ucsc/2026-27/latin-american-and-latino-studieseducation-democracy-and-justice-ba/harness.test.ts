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
