import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2026 (CHEM 3B/3C include lab).
const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'MATH 19B', 'BIOL 20L'],
  ['2272', 'CHEM 3C', 'STAT 7', 'STAT 7L'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A'],
  ['2280', 'CHEM 8B', 'PHYS 6B'],
  ['2282', 'PHYS 6C', 'PHYS 6N', 'BIOL 100'],
  ['2288', 'BIOL 101', 'BIOL 101L', 'BIOL 105'],
  ['2290', 'BIOL 125', 'BIOL 126'],
  ['2292', 'BIOL 128', 'BIOL 129A'],
  ['2298', 'BIOL 129L', 'PSYC 123'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('neuroscience-bs 2026-27', () => {
  it('complete record (BIOL 129L gives DC and comprehensive)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('BIOE 20C is not required', () => {
    const r = run(harness, { terms: base })
    expect(r.status).toBe('met')
    expect(run(harness, { terms: add(base, '2272', 'BIOE 20C') }).unused.map((e) => e.display)).toContain('BIOE 20C')
  })

  it('PHYS 6N specifically is required (6L does not substitute)', () => {
    const r = run(harness, { terms: edit(base, 'PHYS 6N', 'PHYS 6L') })
    expect(find(r, 'physics').status).toBe('unmet')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(early, '2262', 'CHEM 3BL', 'CHEM 3CL') }), 'gen-chem').status).toBe('met')
  })

  it('CHEM 3B/3C with no term and no labs is cannot-check', () => {
    const t = edit(edit(base, 'CHEM 3B', null), 'CHEM 3C', null)
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3C'] }), 'gen-chem').status).toBe('cannot-check')
  })

  it('MATH 11/19 transition accepted; MATH 16 mixing not', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19A', 'MATH 11A') }), 'calc').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 19A', 'MATH 16A') }), 'calc').status).toBe('unmet')
  })

  it('all six core courses including BIOL 126 and 128', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 126', null) }), 'ud-core').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 128', null) }), 'ud-core').status).toBe('unmet')
  })

  it('one BIOL 129A/B/C advanced topics course', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 129A', 'BIOL 129C') }), 'advanced-topics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOL 129A', null) }), 'advanced-topics').status).toBe('unmet')
  })

  it('BIOL 129L is required; without it DC and comprehensive fail too', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 129L', 'BIOL 105L') })
    expect(find(r, 'neuro-lab').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('elective: BIOE 131 alone counts, BIOE 131 + 131L count as one; a lone 131L is cannot-check', () => {
    expect(find(run(harness, { terms: edit(base, 'PSYC 123', 'BIOE 131') }), 'elective').status).toBe('met')
    const both = run(harness, { terms: add(edit(base, 'PSYC 123', 'BIOE 131'), '2298', 'BIOE 131L') })
    expect(find(both, 'elective').status).toBe('met')
    expect(find(both, 'elective').used?.map((e) => e.display).sort()).toEqual(['BIOE 131', 'BIOE 131L'])
    expect(find(run(harness, { terms: edit(base, 'PSYC 123', 'BIOE 131L') }), 'elective').status).toBe('cannot-check')
  })

  it('a required course cannot double as the elective (BIOL 125 is core, not an elective)', () => {
    expect(find(run(harness, { terms: edit(base, 'PSYC 123', 'BIOL 125') }), 'elective').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PSYC 123', 'BIOL 120') }), 'elective').status).toBe('unmet')
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOL 129L': 'P' } }), 'neuro-lab').status).toBe('unmet')
  })

  it('STAT 5 before UCSC + advisor waiver replaces STAT 7/7L', () => {
    const t = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)
    expect(find(run(harness, { terms: t }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['STAT 5'], attested: [] }), 'stats').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, completed: ['STAT 5'] }), 'stats').status).toBe('met')
  })
  it('BIOL 20L: required, but cannot-check for a transfer with term-less BIOL 20A and BIOE 20B', () => {
    const no20l = edit(base, 'BIOL 20L', null)
    expect(find(run(harness, { terms: no20l }), 'bio-intro').status).toBe('unmet')
    expect(find(run(harness, { terms: no20l, entry: 'transfer' }), 'bio-intro').status).toBe('unmet') // 20A/20B taken at UCSC
    const cc = edit(edit(no20l, 'BIOL 20A', null), 'BIOE 20B', null)
    const r = run(harness, { terms: cc, completed: ['BIOL 20A', 'BIOE 20B'], entry: 'transfer' })
    expect(find(r, 'bio-intro').status).toBe('cannot-check')
    expect(find(run(harness, { terms: cc, completed: ['BIOL 20A', 'BIOE 20B'] }), 'bio-intro').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'BIOL 20L': 'P' } }), 'bio-intro').status).toBe('unmet')
  })

  it('a P in BIOL 129L also fails DC and comprehensive', () => {
    const r = run(harness, { terms: base, grades: { 'BIOL 129L': 'P' } })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })
})
