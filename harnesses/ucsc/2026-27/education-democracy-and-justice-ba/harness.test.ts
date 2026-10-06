import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'EDUC 10', 'EDUC 60'],
  ['2278', 'EDUC 110', 'EDUC 128'],
  ['2280', 'EDUC 135', 'EDUC 141'],
  ['2282', 'EDUC 164', 'EDUC 181'],
  ['2288', 'EDUC 102', 'EDUC 190'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('education-democracy-and-justice-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('EDUC 180 instead of 110', () => {
    expect(failing(run(harness, { terms: swap('EDUC 110', 'EDUC 180') }))).toEqual([])
  })

  it('both EDUC 110 and 180: the second counts as an elective', () => {
    expect(failing(run(harness, { terms: swap('EDUC 102', 'EDUC 180') }))).toEqual([])
  })

  it('six electives needed', () => {
    expect(find(run(harness, { terms: swap('EDUC 102') }), 'electives-six').status).toBe('unmet')
  })

  it('EDUC 190 is required (and is the comprehensive and part of DC)', () => {
    const r = run(harness, { terms: swap('EDUC 190') })
    expect(find(r, 'educ190').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('EDUC 10 is required', () => {
    expect(find(run(harness, { terms: swap('EDUC 10') }), 'lower').status).toBe('unmet')
  })

  it('outside electives count with department approval', () => {
    const t = swap('EDUC 102', 'SOCY 148')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: [] }), 'attest:outside-elective-approval').status).toBe('needs-attestation')
  })

  it('at most two outside electives', () => {
    let t = swap('EDUC 102', 'SOCY 148')
    t = t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === 'EDUC 181' ? ['PSYC 108'] : c === 'EDUC 164' ? ['ENVS 177'] : [c])) }))
    expect(find(run(harness, { terms: t }), 'electives-six').status).toBe('unmet')
  })

  it('EDUC 194 counts only once', () => {
    const t = swap('EDUC 102', 'EDUC 194').map((q, i) => (i === 3 ? { ...q, courses: ['EDUC 194', 'EDUC 181'] } : q))
    expect(find(run(harness, { terms: t }), 'electives-six').status).toBe('unmet')
  })

  it('CRES 121 [/EDUC 121] counts as an EDUC elective without approval', () => {
    expect(failing(run(harness, { terms: swap('EDUC 102', 'CRES 121'), attested: [] }))).toEqual([])
  })

  it('a 2-3 credit EDUC course is not an elective', () => {
    expect(find(run(harness, { terms: swap('EDUC 102', 'EDUC 185L') }), 'electives-six').status).toBe('unmet')
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'EDUC 10': 'P', 'EDUC 128': 'P' } }))).toEqual([])
  })
})
