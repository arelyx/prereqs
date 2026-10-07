import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2318', courses: cs }]

// Biomolecular engineering concentration, frosh from fall 2026.
const bmeBase = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'MATH 19B', 'BME 80G', 'BME 21L'],
  ['2272', 'CHEM 3C', 'AM 10', 'BME 22L'],
  ['2278', 'CHEM 8A', 'PHYS 5A', 'PHYS 5L', 'STAT 7', 'STAT 7L'],
  ['2280', 'CHEM 8B', 'PHYS 5B', 'PHYS 5M', 'BME 160'],
  ['2282', 'BIOC 100A', 'BME 105', 'BME 110'],
  ['2288', 'BIOC 100B', 'BME 163', 'BME 185'],
  ['2290', 'BME 128', 'BME 128L', 'BME 130'],
  ['2298', 'BME 129A'],
  ['2300', 'BME 129B'],
  ['2302', 'BME 129C'],
)
const BME = { concentration: 'bme' }

// Bioinformatics concentration.
const binfBase = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 19A', 'CSE 20'],
  ['2270', 'CHEM 3B', 'MATH 19B', 'BME 80G', 'CSE 16'],
  ['2272', 'CHEM 3C', 'MATH 21', 'CSE 30'],
  ['2278', 'CHEM 8A', 'AM 30', 'CSE 40'],
  ['2280', 'CSE 101', 'BME 160', 'STAT 131'],
  ['2282', 'BME 101', 'BME 105', 'BME 110'],
  ['2288', 'BME 163', 'BME 185', 'CSE 142'],
  ['2290', 'CSE 182'],
  ['2298', 'BME 205'],
  ['2300', 'BME 230A'],
  ['2302', 'BME 129C'],
)
const BINF = { concentration: 'binf' }

describe('biomolecular-engineering-and-bioinformatics-bs 2026-27 — BME', () => {
  it('complete record', () => {
    const r = run(harness, { terms: bmeBase, choices: BME })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('needs a concentration', () => {
    expect(run(harness, { terms: bmeBase }).nodes[0].status).toBe('needs-choice')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = bmeBase.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    const r = run(harness, { terms: early, choices: BME })
    expect(find(r, 'gen-chem').status).toBe('unmet')
    const fixed = early.map((q) => (q.term === '2262' ? { ...q, courses: [...q.courses, 'CHEM 3BL', 'CHEM 3CL'] } : q))
    expect(find(run(harness, { terms: fixed, choices: BME }), 'gen-chem').status).toBe('met')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(bmeBase, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t, choices: BME }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'CHEM 4BL'), choices: BME }), 'gen-chem').status).toBe('met')
  })

  it('the elective cannot reuse the modeling/design sequence', () => {
    // BME 128 + 128L is the sequence; BME 130 is the elective. Without BME 130 nothing is left.
    const r = run(harness, { terms: edit(bmeBase, 'BME 130', null), choices: BME })
    expect(find(r, 'elective').status).toBe('unmet')
    expect(find(r, 'modeling-design').status).toBe('met')
  })

  it('the elective may be a 5-credit BME 201-279 graduate course, but not a capstone course', () => {
    expect(failing(run(harness, { terms: edit(bmeBase, 'BME 130', 'BME 237'), choices: BME }))).toEqual([])
    expect(find(run(harness, { terms: edit(bmeBase, 'BME 130', 'BME 273'), choices: BME }), 'elective').status).toBe('unmet') // 3 credits
    // Bioinformatics capstone (205/230A/129C) instead of team design, no other elective
    const t = edit(edit(edit(bmeBase, 'BME 129A', 'BME 205'), 'BME 129B', 'BME 230A'), 'BME 130', null)
    const r = run(harness, { terms: t, choices: BME })
    expect(find(r, 'capstone').status).toBe('met')
    expect(find(r, 'elective').status).toBe('unmet')
  })

  it('modeling/design: BME 128 needs BME 128L', () => {
    const r = run(harness, { terms: edit(bmeBase, 'BME 128L', null), choices: BME })
    expect(find(r, 'modeling-design').status).toBe('unmet')
  })

  it('biochemistry options: BME 101 with CHEM 103 or BIOL 100; BIOC 100A alone is not enough', () => {
    const t = edit(edit(bmeBase, 'BIOC 100A', 'BME 101'), 'BIOC 100B', 'BIOL 100')
    expect(find(run(harness, { terms: t, choices: BME }), 'biochem').status).toBe('met')
    expect(find(run(harness, { terms: edit(bmeBase, 'BIOC 100B', null), choices: BME }), 'biochem').status).toBe('unmet')
  })

  it('substitutions: BIOL 105 for BME 105, CSE 20 for BME 160', () => {
    const t = edit(edit(bmeBase, 'BME 105', 'BIOL 105'), 'BME 160', 'CSE 20')
    expect(failing(run(harness, { terms: t, choices: BME }))).toEqual([])
  })

  it('physics: PHYS 15A for 5A, labs required', () => {
    expect(failing(run(harness, { terms: edit(bmeBase, 'PHYS 5A', 'PHYS 15A'), choices: BME }))).toEqual([])
    expect(find(run(harness, { terms: edit(bmeBase, 'PHYS 5M', null), choices: BME }), 'physics').status).toBe('unmet')
  })

  it('senior thesis needs three quarters of BME 195', () => {
    const noCap = bmeBase.slice(0, 8)
    const two = [...noCap, { term: '2298', courses: ['BME 195'] }, { term: '2300', courses: ['BME 195'] }]
    expect(find(run(harness, { terms: two, choices: BME }), 'capstone').status).toBe('unmet')
    const three = [...two, { term: '2302', courses: ['BME 195'] }]
    expect(find(run(harness, { terms: three, choices: BME }), 'capstone').status).toBe('met')
  })

  it('iGEM capstone works for BME only', () => {
    const igem = [...bmeBase.slice(0, 8), { term: '2290', courses: ['BME 180', 'BME 188A'] }, { term: '2294', courses: ['BME 188B', 'BME 188C'] }]
    expect(find(run(harness, { terms: igem, choices: BME }), 'capstone').status).toBe('met')
  })

  it('letter grades required', () => {
    const r = run(harness, { terms: bmeBase, choices: BME, grades: { 'BME 110': 'P' } })
    expect(find(r, 'bme110').status).toBe('unmet')
  })

  it('exit requirements are an attestation', () => {
    const r = run(harness, { terms: bmeBase, choices: BME, attested: [] })
    expect(find(r, 'attest:exit').status).toBe('needs-attestation')
  })

  it('transfer PHIL 24 before UCSC replaces BME 80G; a UCSC PHIL 24 does not', () => {
    const t = edit(bmeBase, 'BME 80G', null)
    expect(find(run(harness, { terms: t, choices: BME, completed: ['PHIL 24'], entry: 'transfer' }), 'bioethics').status).toBe('met')
    expect(find(run(harness, { terms: add(t, 'PHIL 24'), choices: BME }), 'bioethics').status).toBe('unmet')
  })

  it('BME 185 also satisfies DC; missing it fails both', () => {
    const r = run(harness, { terms: edit(bmeBase, 'BME 185', null), choices: BME })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'tech-writing').status).toBe('unmet')
  })
})

describe('biomolecular-engineering-and-bioinformatics-bs 2026-27 — BINF', () => {
  it('complete record', () => {
    const r = run(harness, { terms: binfBase, choices: BINF })
    expect(failing(r)).toEqual([])
  })

  it('a course used for modeling/design cannot also be the elective', () => {
    const r = run(harness, { terms: edit(binfBase, 'CSE 182', null), choices: BINF })
    // CSE 142 fills modeling/design; the elective could only take BME 205/230A,
    // which the capstone needs — exactly one of the two stays unmet
    expect(find(r, 'modeling-design').status).toBe('met')
    expect([find(r, 'elective').status, find(r, 'capstone').status].sort()).toEqual(['met', 'unmet'])
    const r2 = run(harness, { terms: edit(binfBase, 'CSE 182', 'CSE 144'), choices: BINF })
    expect(failing(r2)).toEqual([])
  })

  it('multivariable calculus: MATH 23A needs MATH 23B; MATH 22 alone works', () => {
    expect(find(run(harness, { terms: edit(binfBase, 'AM 30', 'MATH 23A'), choices: BINF }), 'multivar').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(binfBase, 'AM 30', 'MATH 22'), choices: BINF }), 'multivar').status).toBe('met')
  })

  it('STAT 132 for CSE 40; STAT 131 required separately', () => {
    expect(failing(run(harness, { terms: edit(binfBase, 'CSE 40', 'STAT 132'), choices: BINF }))).toEqual([])
    expect(find(run(harness, { terms: edit(binfBase, 'STAT 131', null), choices: BINF }), 'stat131').status).toBe('unmet')
  })

  it('iGEM is not a BINF capstone option', () => {
    const igem = [...binfBase.slice(0, 8), { term: '2290', courses: ['BME 180', 'BME 188A'] }, { term: '2294', courses: ['BME 188B', 'BME 188C'] }]
    expect(find(run(harness, { terms: igem, choices: BINF }), 'capstone').status).toBe('unmet')
  })

  it('BINF does not need CHEM 8B, physics or lab training', () => {
    const r = run(harness, { terms: binfBase, choices: BINF })
    expect(() => find(r, 'physics')).toThrow()
    expect(() => find(r, 'lab-training')).toThrow()
  })

  it('CSE 101P counts for data structures', () => {
    expect(failing(run(harness, { terms: edit(binfBase, 'CSE 101', 'CSE 101P'), choices: BINF }))).toEqual([])
  })

  it('BIOC 100B is a BINF elective', () => {
    expect(failing(run(harness, { terms: edit(binfBase, 'CSE 182', 'BIOC 100B'), choices: BINF }))).toEqual([])
  })
})

describe('biomolecular-engineering-and-bioinformatics-bs 2026-27 — review 2026-10-06', () => {
  // "CSE 20 has a test-out exam that will also be accepted."
  it('CSE 20 test-out: offered only when neither BME 160 nor CSE 20 is planned', () => {
    const t = edit(bmeBase, 'BME 160', null)
    expect(find(run(harness, { terms: t, choices: BME }), 'bme160-testout').status).toBe('met')
    const no = run(harness, { terms: t, choices: BME, attested: ['exit'] })
    expect(find(no, 'bme160-or-testout').status).toBe('needs-attestation')
    expect(() => find(run(harness, { terms: bmeBase, choices: BME, attested: ['exit'] }), 'bme160-or-testout')).toThrow()
  })

  // "CSE 40 has a test-out option which can satisfy this requirement."
  it('CSE 40 test-out satisfies BINF lower-division statistics', () => {
    const t = edit(binfBase, 'CSE 40', null)
    expect(failing(run(harness, { terms: t, choices: BINF }))).toEqual([])
    expect(find(run(harness, { terms: t, choices: BINF, attested: ['exit'] }), 'ld-stats-or-testout').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, choices: BINF, attested: ['exit', 'Passed the CSE 40 test-out'] }), 'ld-stats-testout').status).toBe('met')
  })

  it('two quarters of BME 195 explain the shortfall', () => {
    const two = [...bmeBase.slice(0, 8), { term: '2298', courses: ['BME 195'] }, { term: '2300', courses: ['BME 195'] }]
    expect(find(run(harness, { terms: two, choices: BME }), 'capstone').detail).toMatch(/2 of 3 quarters/)
  })

  it('cross-listed PHIL 80G counts as BME 80G', () => {
    expect(failing(run(harness, { terms: edit(binfBase, 'BME 80G', 'PHIL 80G'), choices: BINF }))).toEqual([])
  })
})
