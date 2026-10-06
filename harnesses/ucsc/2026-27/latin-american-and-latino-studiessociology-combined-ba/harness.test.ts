import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'LALS 1', 'SOCY 1', 'SOCY 15'],
  ['2278', 'LALS 100', 'LALS 100A', 'LALS 100L', 'SOCY 105A'],
  ['2280', 'SOCY 105B', 'LALS 143', 'SOCY 156'],
  ['2282', 'LALS 181', 'SOCY 170'],
  ['2288', 'LALS 194B', 'LALS 194L'],
)
const swap = (from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studiessociology-combined-ba 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('SOCY 196S satisfies the comprehensive instead of the LALS seminar + lab', () => {
    const t = swap('LALS 194B', 'SOCY 196S').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LALS 194L') }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('LALS seminar without LALS 194L does not satisfy the comprehensive', () => {
    expect(find(run(harness, { terms: swap('LALS 194L') }), 'comprehensive').status).toBe('unmet')
  })

  it('needs two of SOCY 1/10/15', () => {
    expect(find(run(harness, { terms: swap('SOCY 15') }), 'socy-ld').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('SOCY 15', 'SOCY 10') }), 'socy-ld').status).toBe('met')
  })

  it('SOCY 105B is required', () => {
    expect(find(run(harness, { terms: swap('SOCY 105B') }), 'core').status).toBe('unmet')
  })

  it('sociology electives are 110-189: SOCY 105A/B, 196S and 199 do not count', () => {
    expect(find(run(harness, { terms: swap('SOCY 170', 'SOCY 199') }), 'socy-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('SOCY 170', 'SOCY 196S') }), 'socy-electives').status).toBe('unmet')
  })

  it('two LALS electives needed', () => {
    expect(find(run(harness, { terms: swap('LALS 181') }), 'lals-electives').status).toBe('unmet')
  })

  it('a grade below C does not count; P does', () => {
    expect(find(run(harness, { terms: base, grades: { 'SOCY 170': 'D+' } }), 'socy-electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: base, grades: { 'SOCY 170': 'P' } }))).toEqual([])
  })

  it('DC needs LALS 100L', () => {
    expect(find(run(harness, { terms: swap('LALS 100L') }), 'dc').status).toBe('unmet')
  })
})

describe('latin-american-and-latino-studiessociology-combined-ba 2026-27 review (wave 2)', () => {
  it('LALS 186 [/SOCY 186] counts once: it cannot fill both a LALS and a SOCY elective', () => {
    const r = run(harness, { terms: [...swap('LALS 181', 'LALS 186').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'SOCY 170') })), ...plan(['2290', 'SOCY 186'])] })
    expect([find(r, 'lals-electives').status, find(r, 'socy-electives').status]).toContain('unmet')
  })

  it('SOCY 186 entered under its SOCY code can be a sociology elective', () => {
    expect(failing(run(harness, { terms: swap('SOCY 170', 'SOCY 186') }))).toEqual([])
  })

  it('SOCY 1, 10 and 15 all taken: two count, the third is not an elective', () => {
    const r = run(harness, { terms: [...swap('SOCY 170'), ...plan(['2290', 'SOCY 10'])] })
    expect(find(r, 'socy-ld').status).toBe('met')
    expect(find(r, 'socy-electives').status).toBe('unmet')
  })

  it('LALS 194L alone with SOCY 196S absent: no comprehensive', () => {
    expect(find(run(harness, { terms: swap('LALS 194B') }), 'comprehensive').status).toBe('unmet')
  })

  it('a LALS senior seminar is not a LALS elective (101-190)', () => {
    expect(find(run(harness, { terms: [...swap('LALS 181'), ...plan(['2290', 'LALS 194A'])] }), 'lals-electives').status).toBe('unmet')
  })

  it('a C- in SOCY 105A fails the core', () => {
    expect(find(run(harness, { terms: base, grades: { 'SOCY 105A': 'C-' } }), 'core').status).toBe('unmet')
  })

  it('no-term credit, empty plan, kitchen sink', () => {
    expect(failing(run(harness, { terms: swap('SOCY 1'), completed: ['SOCY 1'] }))).toEqual([])
    const e = run(harness, { terms: [] })
    expect(find(e, 'core').status).toBe('unmet')
    expect(find(e, 'comprehensive').status).toBe('unmet')
    const sink = [...base, ...plan(['2290', 'SOCY 10', 'SOCY 196S', 'LALS 5', 'LALS 10', 'SOCY 128', 'LALS 135', 'SOCY 3A'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
  })
})
