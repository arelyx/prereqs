import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

type Terms = ReturnType<typeof plan>
const swapIn = (terms: Terms, from: string, ...to: string[]) =>
  terms.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

// General: two of SOCY 1/10/15, SOCY 3A, 3B, 105A, 105B, five SOCY 110-189, senior seminar.
const general = plan(
  ['2268', 'SOCY 1', 'SOCY 10'],
  ['2270', 'SOCY 3A', 'SOCY 3B'],
  ['2278', 'SOCY 105A', 'SOCY 111'],
  ['2280', 'SOCY 105B', 'SOCY 120', 'SOCY 141'],
  ['2282', 'SOCY 170', 'SOCY 185'],
  ['2288', 'SOCY 196S'],
)
const swap = (from: string, ...to: string[]) => swapIn(general, from, ...to)

describe('sociology-ba 2026-27 general', () => {
  it('complete record (general is the default)', () => {
    expect(failing(run(harness, { terms: general }))).toEqual([])
    expect(failing(run(harness, { terms: general, choices: { concentration: 'General Sociology Major' } }))).toEqual([])
  })

  it('SOCY 15 can be one of the two preparation courses', () => {
    expect(find(run(harness, { terms: swap('SOCY 10', 'SOCY 15') }), 'prep').status).toBe('met')
    expect(find(run(harness, { terms: swap('SOCY 10') }), 'prep').status).toBe('unmet')
  })

  it('preparation course taken P/NP: letter-grade rule → cannot-check, not met', () => {
    expect(find(run(harness, { terms: general, grades: { 'SOCY 1': 'P' } }), 'prep').status).toBe('cannot-check')
  })

  it('other courses may be P/NP', () => {
    expect(failing(run(harness, { terms: general, grades: { 'SOCY 120': 'P', 'SOCY 3B': 'P' } }))).toEqual([])
  })

  it('SOCY 3B substitutes: STAT 5, STAT 7, PSYC 2', () => {
    for (const s of ['STAT 5', 'STAT 7', 'PSYC 2']) expect(find(run(harness, { terms: swap('SOCY 3B', s) }), 'socy3b').status).toBe('met')
    expect(find(run(harness, { terms: swap('SOCY 3B'), attested: [] }), 'socy3b').status).toBe('needs-attestation')
  })

  it('LALS 100A substitutes for SOCY 3A only for a LALS double major/minor', () => {
    const t = swap('SOCY 3A', 'LALS 100A')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: [] }), 'attest:lals-double').status).toBe('needs-attestation')
  })

  it('PSYC 100 substitutes for SOCY 3A only for a psychology/cognitive science double major', () => {
    const t = swap('SOCY 3A', 'PSYC 100')
    expect(failing(run(harness, { terms: t, attested: ['psychology double major'] }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: ['lals'] }), 'attest:psyc-double').status).toBe('needs-attestation')
  })

  it('missing SOCY 3A with no substitute is unmet', () => {
    expect(find(run(harness, { terms: swap('SOCY 3A') }), 'socy3a').status).toBe('unmet')
  })

  it('needs five electives numbered 110-189', () => {
    expect(find(run(harness, { terms: swap('SOCY 185') }), 'advanced').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('SOCY 185', 'SOCY 3B') }), 'advanced').status).toBe('unmet')
  })

  it('an outside upper-division course might be pre-approved: cannot-check', () => {
    expect(find(run(harness, { terms: swap('SOCY 185', 'ANTH 130A') }), 'advanced').status).toBe('cannot-check')
  })

  it('no more than two outside courses toward the five electives', () => {
    let t = swap('SOCY 185', 'ANTH 130A')
    t = swapIn(t, 'SOCY 170', 'POLI 140C')
    t = swapIn(t, 'SOCY 141', 'LALS 143')
    expect(find(run(harness, { terms: t }), 'advanced').status).toBe('unmet')
  })

  it('comprehensive: a graduate SOCY course instead of the seminar', () => {
    expect(failing(run(harness, { terms: swap('SOCY 196S', 'SOCY 222') }))).toEqual([])
  })

  it('comprehensive: two quarters of senior thesis', () => {
    expect(failing(run(harness, { terms: swap('SOCY 196S', 'SOCY 195A', 'SOCY 195B') }))).toEqual([])
    expect(find(run(harness, { terms: swap('SOCY 196S', 'SOCY 195A') }), 'comprehensive').status).toBe('unmet')
  })

  it('one thesis course may also count as an elective (but only one)', () => {
    const t = swap('SOCY 196S', 'SOCY 195A', 'SOCY 195B')
    expect(failing(run(harness, { terms: swapIn(t, 'SOCY 185') }))).toEqual([])
    expect(find(run(harness, { terms: swapIn(swapIn(t, 'SOCY 185'), 'SOCY 170') }), 'advanced').status).toBe('unmet')
  })

  it('without a comprehensive option the major is incomplete', () => {
    expect(find(run(harness, { terms: swap('SOCY 196S') }), 'comprehensive').status).toBe('unmet')
  })

  it('DC needs SOCY 105A and 105B', () => {
    expect(find(run(harness, { terms: swap('SOCY 105B') }), 'dc').status).toBe('unmet')
  })
})

// DJS: SOCY 30A + two of 1/10/15, 3A, 3B, 107A, 107B, 105A, 105B, five electives, 196G (+ deliverable).
const djs = plan(
  ['2268', 'SOCY 1', 'SOCY 15', 'SOCY 30A'],
  ['2270', 'SOCY 3A', 'SOCY 3B', 'SOCY 107A'],
  ['2272', 'SOCY 107B'],
  ['2278', 'SOCY 105A', 'SOCY 196G', 'SOCY 132'],
  ['2280', 'SOCY 105B', 'SOCY 151', 'SOCY 175'],
  ['2282', 'SOCY 172', 'SOCY 174'],
  ['2288', 'SOCY 196S'],
)
const D = { concentration: 'DJS' }

describe('sociology-ba 2026-27 DJS', () => {
  it('complete DJS record', () => {
    expect(failing(run(harness, { terms: djs, choices: D }))).toEqual([])
  })

  it('the general record lacks SOCY 30A, 107A/B and 196G', () => {
    const r = run(harness, { terms: general, choices: D })
    expect(find(r, 'socy30a').status).toBe('unmet')
    expect(find(r, 'djs-core').status).toBe('unmet')
    expect(find(r, 'practicum').status).toBe('unmet')
  })

  it('SOCY 196G is required', () => {
    expect(find(run(harness, { terms: swapIn(djs, 'SOCY 196G'), choices: D }), 'practicum').status).toBe('unmet')
  })

  it('the practicum deliverable must be mounted (attestation)', () => {
    expect(find(run(harness, { terms: djs, choices: D, attested: [] }), 'attest:djs-deliverable').status).toBe('needs-attestation')
  })

  it('SOCY 30A must be taken for a letter grade', () => {
    expect(find(run(harness, { terms: djs, choices: D, grades: { 'SOCY 30A': 'P' } }), 'socy30a').status).toBe('cannot-check')
  })

  it('outside courses: no limit for DJS (pre-approved list) → cannot-check', () => {
    let t = swapIn(djs, 'SOCY 172', 'CMPM 146')
    t = swapIn(t, 'SOCY 174', 'LALS 143')
    t = swapIn(t, 'SOCY 175', 'ENVS 110')
    expect(find(run(harness, { terms: t, choices: D }), 'advanced').status).toBe('cannot-check')
  })

  it('SOCY 107A/B and 196G do not count as electives', () => {
    expect(find(run(harness, { terms: swapIn(djs, 'SOCY 174', 'SOCY 107A'), choices: D }), 'advanced').status).toBe('unmet')
  })
})

describe('sociology-ba 2026-27 adversarial', () => {
  const t = (from: string, ...to: string[]) => swapIn(general, from, ...to)

  it('a lone thesis quarter (no thesis) may be an approved individual-study substitute: cannot-check', () => {
    expect(find(run(harness, { terms: t('SOCY 185', 'SOCY 195A') }), 'advanced').status).toBe('cannot-check')
  })

  it('a completed thesis offers only one course as an elective', () => {
    const r = run(harness, { terms: swapIn(t('SOCY 185', 'SOCY 195A', 'SOCY 195B', 'SOCY 195C'), 'SOCY 170') })
    expect(find(r, 'advanced').status).toBe('unmet')
  })

  it('the senior seminar cannot double as a substitute elective', () => {
    expect(find(run(harness, { terms: [...t('SOCY 185'), ...plan(['2290', 'SOCY 222'])] }), 'advanced').status).toBe('unmet')
  })

  it('SOCY 3A present and LALS 100A also taken: no attestation needed', () => {
    const r = run(harness, { terms: [...general, ...plan(['2290', 'LALS 100A'])], attested: [] })
    expect(failing(r)).toEqual([])
  })
})

describe('sociology-ba 2026-27 review (wave 2)', () => {
  const t = (from: string, ...to: string[]) => swapIn(general, from, ...to)

  // "as well as an AP Statistics score of 4 or more, may substitute for SOCY 3B."
  it('AP Statistics 4+ is an attestation asked only when SOCY 3B (or a listed substitute) is missing', () => {
    const r = run(harness, { terms: t('SOCY 3B'), attested: [] })
    expect(find(r, 'socy3b').status).toBe('needs-attestation')
    expect(find(r, 'socy3b').attest?.id).toBe('ap-stats')
    expect(failing(run(harness, { terms: t('SOCY 3B'), attested: ['AP Statistics'] }))).toEqual([])
    expect(failing(run(harness, { terms: general, attested: [] }))).toEqual([])
  })

  it('LALS 186 entered under its LALS code is SOCY 186 (cross-listed): a sociology elective', () => {
    expect(failing(run(harness, { terms: t('SOCY 185', 'LALS 186'), attested: [] }))).toEqual([])
  })

  it('LGST 126 is SOCY 128 (cross-listed): a sociology elective', () => {
    expect(failing(run(harness, { terms: t('SOCY 185', 'LGST 126'), attested: [] }))).toEqual([])
  })

  it('a 2-credit SOCY course in 110-189 is not an elective', () => {
    expect(find(run(harness, { terms: t('SOCY 185', 'SOCY 113C') }), 'advanced').status).toBe('unmet')
  })

  it('a P in SOCY 105A counts (only qualification courses need letter grades)', () => {
    expect(failing(run(harness, { terms: general, grades: { 'SOCY 105A': 'P' } }))).toEqual([])
  })

  it('a failing grade in SOCY 196S: no comprehensive', () => {
    expect(find(run(harness, { terms: general, grades: { 'SOCY 196S': 'F' } }), 'comprehensive').status).toBe('unmet')
  })

  it('a 2-credit graduate SOCY course does not satisfy the comprehensive', () => {
    expect(find(run(harness, { terms: t('SOCY 196S', 'SOCY 290W') }), 'comprehensive').status).toBe('unmet')
  })

  it('DJS: SOCY 30A for a letter grade is needed but the qualification B- is not a completion rule', () => {
    expect(failing(run(harness, { terms: djs, choices: D, grades: { 'SOCY 30A': 'C' } }))).toEqual([])
  })

  it('no-term (transfer) credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: t('SOCY 1'), completed: ['SOCY 1'] }))).toEqual([])
    const e = run(harness, { terms: [], attested: [] })
    expect(find(e, 'prep').status).toBe('unmet')
    expect(find(e, 'comprehensive').status).toBe('unmet')
    const sink = [...djs, ...plan(['2290', 'SOCY 10', 'SOCY 111', 'SOCY 120', 'STAT 7', 'LALS 100A', 'SOCY 195A', 'SOCY 195B', 'SOCY 222'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
    expect(failing(run(harness, { terms: sink, choices: D }))).toEqual([])
  })
})
