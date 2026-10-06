import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2025 (2025-26 catalog: CHEM 3BL/3CL always required).
const base = plan(
  ['2258', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2260', 'BIOE 20B', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B', 'BIOL 20L'],
  ['2262', 'BIOE 20C', 'CHEM 3C', 'CHEM 3CL', 'STAT 7', 'STAT 7L'],
  ['2268', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L'],
  ['2270', 'CHEM 8B', 'PHYS 6B'],
  ['2272', 'PHYS 6C', 'BIOL 100'],
  ['2278', 'BIOL 101', 'BIOL 101L', 'BIOL 105'],
  ['2280', 'BIOL 110', 'BIOL 120', 'BME 110'],
  ['2282', 'BIOL 112', 'BIOE 109'],
  ['2288', 'BIOL 105L'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('molecular-cell-and-developmental-biology-bs 2025-26', () => {
  it('complete record (BIOL 105L is the lab elective, DC and comprehensive)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('BIOE 20C is required', () => {
    expect(run(harness, { terms: edit(base, 'BIOE 20C', null) }).status).toBe('unmet')
  })

  it('2025-26: CHEM 3BL and 3CL are required with CHEM 3B/3C whatever the term', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3BL', null) }), 'gen-chem').status).toBe('unmet')
    const late = base.map((q) => ({ ...q, term: String(Number(q.term) + 10) })) // fall 2026 start
    expect(find(run(harness, { terms: edit(edit(late, 'CHEM 3BL', null), 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: prior CHEM 1A, 1B, 1C and 1N satisfy general chemistry', () => {
    const noThree = ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL'].reduce((t, c) => edit(t, c, null), base)
    expect(find(run(harness, { terms: noThree, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'] }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: noThree, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C'] }), 'gen-chem').status).toBe('unmet')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2262', 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('MATH 11/19 transition accepted; MATH 16 mixing not', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 11B') }), 'calc').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 19B', 'MATH 16B') }), 'calc').status).toBe('unmet')
  })

  it('BIOL 110 is a core course here', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 110', null) }), 'ud-core').status).toBe('unmet')
  })

  it('2025-26: BIOL 120 is a required core course (no BIOL 128/BME 178 substitute)', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 120', 'BME 178') }), 'ud-core').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 120', 'BIOL 128') }), 'ud-core').status).toBe('unmet')
  })

  it('2025-26: BME 178 is an elective', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 109', 'BME 178') }), 'electives-two').status).toBe('met')
  })

  it('bioinformatics slot accepts its alternatives only', () => {
    expect(find(run(harness, { terms: edit(base, 'BME 110', 'BIOL 104L') }), 'bioinformatics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BME 110', null) }), 'bioinformatics').status).toBe('unmet')
  })

  it('at least one of the two electives must be BIOL', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 112', 'BME 130') })
    expect(find(r, 'electives-two').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 109', 'BIOL 124') }), 'electives-two').status).toBe('met')
  })

  it('one course cannot fill both the bioinformatics slot and an elective', () => {
    // BME 110 can only fill the bioinformatics slot, not also an elective.
    const r = run(harness, { terms: edit(base, 'BIOE 109', 'BME 110') })
    expect(find(r, 'electives-two').status).toBe('unmet')
  })

  it('the lab elective is required and comes from its own list; it gives DC and comprehensive', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 105L', null) })
    expect(find(r, 'elective-lab').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    // BIOL 102L is a first-lab course only
    expect(find(run(harness, { terms: edit(base, 'BIOL 105L', 'BIOL 102L') }), 'elective-lab').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOL 105L', 'CHEM 161L') }), 'dc').status).toBe('met')
  })

  it('first lab: BIOL 101L or alternatives', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', 'CHEM 160K') }), 'lab1').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOL 101L', null) }), 'lab1').status).toBe('unmet')
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOL 112': 'P' } }), 'electives-two').status).toBe('unmet')
  })

  it('2025-26: STAT 5 alone is a listed statistics option (no advisor waiver)', () => {
    const t = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)
    expect(find(run(harness, { terms: t }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['STAT 5'], attested: [] }), 'stats').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'stats').status).toBe('unmet')
  })

  it('BIOL 20L: required, but cannot-check for a transfer with term-less BIOL 20A and BIOE 20B', () => {
    const no20l = edit(base, 'BIOL 20L', null)
    expect(find(run(harness, { terms: no20l }), 'bio-chem-core').status).toBe('unmet')
    expect(find(run(harness, { terms: no20l, entry: 'transfer' }), 'bio-chem-core').status).toBe('unmet') // 20A/20B taken at UCSC
    const cc = edit(edit(no20l, 'BIOL 20A', null), 'BIOE 20B', null)
    const r = run(harness, { terms: cc, completed: ['BIOL 20A', 'BIOE 20B'], entry: 'transfer' })
    expect(find(r, 'bio-chem-core').status).toBe('cannot-check')
    expect(find(run(harness, { terms: cc, completed: ['BIOL 20A', 'BIOE 20B'] }), 'bio-chem-core').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'BIOL 20L': 'P' } }), 'bio-chem-core').status).toBe('unmet')
  })

  it('BIOL 120 is a core course while BIOL 120L is the lab elective', () => {
    const r = run(harness, { terms: edit(base, 'BIOL 105L', 'BIOL 120L') })
    expect(failing(r)).toEqual([])
  })

  describe('review 2026-10-06 (adversarial)', () => {
    const noStat = edit(edit(base, 'STAT 7', null), 'STAT 7L', null)

    it('2025-26: STAT 5 taken at UCSC (with a term) satisfies statistics', () => {
      const r = run(harness, { terms: add(noStat, '2262', 'STAT 5'), attested: [] })
      expect(find(r, 'stats').status).toBe('met')
      expect(r.status).toBe('met')
    })

    it('2025-26: BIOL 128 is neither core nor elective', () => {
      expect(find(run(harness, { terms: edit(base, 'BIOL 112', 'BIOL 128') }), 'electives-two').status).toBe('unmet')
    })

    it('BIOL 104A fills bioinformatics while BIOL 104B is the lab elective', () => {
      expect(run(harness, { terms: edit(edit(base, 'BME 110', 'BIOL 104A'), 'BIOL 105L', 'BIOL 104B') }).status).toBe('met')
    })

    it('any one of PHYS 6L/6M/6N; none fails only the physics lab', () => {
      expect(run(harness, { terms: edit(base, 'PHYS 6L', 'PHYS 6N') }).status).toBe('met')
      expect(failing(run(harness, { terms: edit(base, 'PHYS 6L', null) }))).toEqual(['physics-lab:unmet'])
    })

    it('a P-graded lab elective fails the lab, DC and comprehensive (letter grade policy)', () => {
      const r = run(harness, { terms: edit(base, 'BIOL 105L', 'BIOL 186L'), grades: { 'BIOL 186L': 'P' } })
      expect(failing(r)).toEqual(['elective-lab:unmet', 'dc:unmet', 'comprehensive:unmet'])
    })

    it('planned courses are in-progress', () => {
      const r = run(harness, { terms: base, currentTerm: '2282' })
      expect(r.status).toBe('in-progress')
      expect(find(r, 'elective-lab').status).toBe('in-progress')
    })

    it('term-less transfer credit counts as a course', () => {
      expect(run(harness, { terms: edit(base, 'PHYS 6A', null), completed: ['PHYS 6A'] }).status).toBe('met')
    })

    it('kitchen sink is met; empty plan is unmet', () => {
      const extra = ['BIOL 111A', 'BIOL 125', 'BIOL 129L', 'CHEM 160L', 'BIOL 128', 'BME 178', 'BIOL 104L', 'CHEM 4A', 'CHEM 4AL', 'STAT 5', 'MATH 16A', 'PHYS 6N']
      expect(run(harness, { terms: [...base, { term: '2290', courses: extra }] }).status).toBe('met')
      expect(run(harness, { terms: [] }).status).toBe('unmet')
    })
  })
})
