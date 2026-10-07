import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// General major: 5 lower-division + 8 upper-division (PSYC 100, Dev/Cog/Soc,
// three more from three subfields, one outside course).
const general = plan(
  ['2268', 'PSYC 1', 'MATH 3'],
  ['2270', 'PSYC 2', 'PSYC 10'],
  ['2272', 'PSYC 20'],
  ['2278', 'PSYC 100'],
  ['2280', 'PSYC 104', 'PSYC 120'],
  ['2282', 'PSYC 141', 'PSYC 160'],
  ['2288', 'PSYC 102', 'PSYC 121'],
  ['2290', 'SOCY 120', 'PSYC 119A'],
)
const G = { concentration: 'general' }

describe('psychology-ba 2025-26 general', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms: general, choices: G }))).toEqual([])
  })

  it('needs a concentration choice first', () => {
    const r = run(harness, { terms: general })
    expect(r.nodes[0].status).toBe('needs-choice')
  })

  it('three additional courses must come from three different subfields', () => {
    // swap PSYC 160 (clinical) for another developmental course: dev twice among the three
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PSYC 160' ? 'PSYC 103' : c)) }))
    // still possible? dev: 104,102,103,119A ; cog 120,121; soc 141 → core dev, cog=120, soc=141;
    // additional: 102/103/119A (dev) + 121 (cog) → only two subfields → unmet
    expect(find(run(harness, { terms: t, choices: G }), 'additional-subfields').status).toBe('unmet')
  })

  it('a seminar is required', () => {
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PSYC 119A' ? 'PSYC 103' : c)) }))
    const r = run(harness, { terms: t, choices: G })
    expect(find(r, 'seminar').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('outside course: listed area or specific list, 100-189, not PSYC', () => {
    const swap = (to: string) => general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'SOCY 120' ? to : c)) }))
    expect(find(run(harness, { terms: swap('CSE 140'), choices: G }), 'outside').status).toBe('met')
    expect(find(run(harness, { terms: swap('CSE 101'), choices: G }), 'outside').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('ECON 195'), choices: G }), 'outside').status).toBe('unmet')
    expect(find(run(harness, { terms: swap('BIOE 107'), choices: G }), 'outside').status).toBe('met')
  })

  it('statistics option STAT 7 needs its lab', () => {
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PSYC 2' ? 'STAT 7' : c)) }))
    expect(find(run(harness, { terms: t, choices: G }), 'stats').status).toBe('unmet')
    t[1].courses.push('STAT 7L')
    expect(find(run(harness, { terms: t, choices: G }), 'stats').status).toBe('met')
  })

  it('B- qualification grades do not block completion', () => {
    const r = run(harness, { terms: general, choices: G, grades: { 'PSYC 1': 'C', 'PSYC 2': 'P' } })
    expect(failing(r)).toEqual([])
  })

  it('a course cannot fill a core subfield and an additional slot at once', () => {
    // Drop the extra cognitive course: cognitive core takes PSYC 120, no second cog.
    const t = general.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'PSYC 121') }))
    expect(find(run(harness, { terms: t, choices: G }), 'additional-subfields').status).toBe('unmet')
  })
})

describe('psychology-ba 2025-26 intensive', () => {
  const intensive = [...general, ...plan(['2292', 'PSYC 181', 'PSYC 194A'], ['2298', 'PSYC 194A'])]
  const I = { concentration: 'intensive' }

  it('complete intensive record', () => {
    expect(failing(run(harness, { terms: intensive, choices: I }))).toEqual([])
  })

  it('needs PSYC 181 or 182', () => {
    const t = intensive.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'PSYC 181') }))
    expect(find(run(harness, { terms: t, choices: I }), 'advanced-methods').status).toBe('unmet')
  })

  it('needs two quarters of independent study; PSYC 193I counts as both', () => {
    const one = intensive.slice(0, -1)
    expect(find(run(harness, { terms: one, choices: I }), 'independent-study').status).toBe('unmet')
    const i193 = [...general, ...plan(['2292', 'PSYC 181', 'PSYC 193I'])]
    expect(find(run(harness, { terms: i193, choices: I }), 'independent-study').status).toBe('met')
  })

  it('2025-26: PSYC 193S is not on the independent-study list', () => {
    const t = [...general, ...plan(['2292', 'PSYC 181', 'PSYC 193S'], ['2298', 'PSYC 193S'])]
    expect(find(run(harness, { terms: t, choices: I }), 'independent-study').status).toBe('unmet')
  })

  it('PSYC 181 cannot double as the methods additional course', () => {
    // general record's additional = dev/cog/clin; replace PSYC 160 with nothing → needs a third subfield
    const t = intensive.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'PSYC 160') }))
    const r = run(harness, { terms: t, choices: I })
    const statuses = [find(r, 'additional-subfields').status, find(r, 'advanced-methods').status, find(r, 'independent-study').status]
    expect(statuses).toContain('unmet')
  })
})
