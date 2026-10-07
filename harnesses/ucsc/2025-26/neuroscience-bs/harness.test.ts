import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2025 (2025-26 catalog: CHEM 3BL/3CL always required).
const base = plan(
  ['2258', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2260', 'BIOE 20B', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B', 'BIOL 20L'],
  ['2262', 'CHEM 3C', 'CHEM 3CL', 'STAT 7', 'STAT 7L'],
  ['2268', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A'],
  ['2270', 'CHEM 8B', 'PHYS 6B'],
  ['2272', 'PHYS 6C', 'PHYS 6N', 'BIOL 100'],
  ['2278', 'BIOL 101', 'BIOL 101L', 'BIOL 105'],
  ['2280', 'BIOL 125', 'BIOL 126'],
  ['2282', 'BIOL 128', 'BIOL 129A'],
  ['2288', 'BIOL 129L', 'PSYC 123'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('neuroscience-bs 2025-26', () => {
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
    expect(run(harness, { terms: add(base, '2262', 'BIOE 20C') }).unused.map((e) => e.display)).toContain('BIOE 20C')
  })

  it('PHYS 6N specifically is required (6L does not substitute)', () => {
    const r = run(harness, { terms: edit(base, 'PHYS 6N', 'PHYS 6L') })
    expect(find(r, 'physics').status).toBe('unmet')
  })

  it('2025-26: CHEM 3BL and 3CL are required with CHEM 3B/3C whatever the term', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
    const late = base.map((q) => ({ ...q, term: String(Number(q.term) + 10) })) // fall 2026 start
    expect(find(run(harness, { terms: edit(edit(late, 'CHEM 3BL', null), 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: CHEM 3B/3C with no term and no labs is unmet (labs always required)', () => {
    const t = ['CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'].reduce((x, c) => edit(x, c, null), base)
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3C'] }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'] }), 'gen-chem').status).toBe('met')
  })

  it('2025-26: prior CHEM 1A, 1B, 1C and 1N satisfy general chemistry', () => {
    const noThree = ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'].reduce((t, c) => edit(t, c, null), base)
    expect(find(run(harness, { terms: noThree, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'] }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: noThree, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C'] }), 'gen-chem').status).toBe('unmet')
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
    const both = run(harness, { terms: add(edit(base, 'PSYC 123', 'BIOE 131'), '2288', 'BIOE 131L') })
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

  it('2025-26: STAT 5 alone is a listed statistics option (no advisor waiver)', () => {
    const t = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)
    expect(find(run(harness, { terms: t }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['STAT 5'], attested: [] }), 'stats').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'stats').status).toBe('unmet')
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

  describe('review 2026-10-06 (adversarial)', () => {
    const noStat = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)

    it('2025-26: STAT 5 taken at UCSC (with a term) satisfies statistics', () => {
      const r = run(harness, { terms: add(noStat, '2262', 'STAT 5'), attested: [] })
      expect(find(r, 'stats').status).toBe('met')
      expect(r.status).toBe('met')
    })

    it('BIOE 20C does not replace BIOE 20B', () => {
      expect(failing(run(harness, { terms: edit(base, 'BIOE 20B', 'BIOE 20C') }))).toEqual(['bio-intro/BIOE20B:unmet'])
    })

    it('a second BIOL 129 topics course is not an elective', () => {
      expect(failing(run(harness, { terms: edit(base, 'PSYC 123', 'BIOL 129B') }))).toEqual(['elective:unmet'])
    })

    it('no C minimum for completion: a D passes, NP does not', () => {
      expect(run(harness, { terms: base, grades: { 'BIOL 125': 'D' } }).status).toBe('met')
      expect(failing(run(harness, { terms: base, grades: { 'BIOL 125': 'NP' } }))).toEqual(['ud-core/BIOL125:unmet'])
    })

    it('CHEM 4A/4AL/4B/4BL path is met', () => {
      const t = add(edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL'), '2262', 'CHEM 4BL')
      expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('met')
    })

    it('term-less transfer credit counts as a course', () => {
      expect(run(harness, { terms: edit(base, 'PHYS 6A', null), completed: ['PHYS 6A'] }).status).toBe('met')
    })

    it('planned courses are in-progress', () => {
      const r = run(harness, { terms: base, currentTerm: '2282' })
      expect(r.status).toBe('in-progress')
      expect(find(r, 'dc').status).toBe('in-progress')
    })

    it('kitchen sink is met; empty plan is unmet', () => {
      const extra = ['BIOE 131', 'BIOE 131L', 'BIOL 110', 'CHEM 4A', 'CHEM 4AL', 'MATH 11A', 'STAT 5', 'BIOL 129B', 'BIOL 102L']
      expect(run(harness, { terms: [...base, { term: '2300', courses: extra }] }).status).toBe('met')
      expect(run(harness, { terms: [] }).status).toBe('unmet')
    })
  })
})
