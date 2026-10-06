import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const general = plan(
  ['2268', 'ECON 1', 'AM 11A', 'CSE 20'],
  ['2270', 'ECON 2', 'AM 11B', 'ECON 10A'],
  ['2272', 'STAT 17', 'STAT 17L', 'ECON 10B', 'TIM 50'],
  ['2278', 'ECON 100A', 'ECON 113'],
  ['2280', 'ECON 100B', 'ECON 104'],
  ['2282', 'ECON 133', 'ECON 136', 'ECON 161A'],
  ['2288', 'ECON 110', 'ECON 140'],
)
const G = { concentration: 'general' }
type Terms = typeof general
const swapIn = (t: Terms, from: string, to: string) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (t: Terms, code: string) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))
const add = (t: Terms, ...codes: string[]) => [...t, { term: '2290', courses: codes }]

describe('business-management-economics-ba 2026-27 general', () => {
  it('complete general record', () => {
    const r = run(harness, { terms: general, choices: G })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('undeclared students are checked against the general major', () => {
    expect(failing(run(harness, { terms: general }))).toEqual([])
  })

  it('ECON 10A and 10B are required', () => {
    expect(find(run(harness, { terms: drop(general, 'ECON 10B'), choices: G }), 'core-lower').status).toBe('unmet')
  })

  it('computer literacy needs two courses in the general major', () => {
    expect(find(run(harness, { terms: drop(general, 'TIM 50'), choices: G }), 'computing').status).toBe('unmet')
  })

  it('CSE 20 test-out counts as one computer-literacy course', () => {
    const r = run(harness, { terms: drop(general, 'TIM 50'), choices: { ...G, cse20testout: 'yes' } })
    expect(find(r, 'computing').status).toBe('met')
  })

  it('CSE 13S and ECE 13 are the same course for credit', () => {
    const t = swapIn(swapIn(general, 'CSE 20', 'CSE 13S'), 'TIM 50', 'ECE 13')
    expect(find(run(harness, { terms: t, choices: G }), 'computing').status).toBe('unmet')
  })

  it('needs one finance elective', () => {
    // ECON 133 -> ECON 138 (business management only): no finance course left
    const r = run(harness, { terms: swapIn(general, 'ECON 133', 'ECON 138'), choices: G })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('ECON 101 can be the finance course', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 133', 'ECON 101'), choices: G }), 'electives').status).toBe('met')
  })

  it('needs one economics elective from the economics list', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 115'), choices: G }), 'electives').status).toBe('unmet')
  })

  it('only one of ECON 130, 159, 160A, 160B, 188', () => {
    // 159 as a business course and 130 as the economics elective: two of the five
    const t = swapIn(swapIn(general, 'ECON 161A', 'ECON 159'), 'ECON 140', 'ECON 130')
    const n = find(run(harness, { terms: t, choices: G }), 'electives')
    expect(n.status).toBe('unmet')
    // one of them is fine
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 130'), choices: G }), 'electives').status).toBe('met')
  })

  it('cross-listed LGST 160A counts as ECON 160A', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'LGST 160A'), choices: G }), 'electives').status).toBe('met')
  })

  it('ECON 195/199 fills the economics elective', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 199'), choices: G }), 'electives').status).toBe('met')
  })

  it('ECON 195 replacing a business elective is not called unmet (page: "one of the five")', () => {
    const r = run(harness, { terms: swapIn(general, 'ECON 161A', 'ECON 195'), choices: G })
    expect(find(r, 'electives').status).toBe('cannot-check')
  })

  it('ECON 195 and ECON 199 together: only one may count', () => {
    const t = swapIn(swapIn(general, 'ECON 161A', 'ECON 195'), 'ECON 140', 'ECON 199')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('unmet')
  })

  it('ECON 193 field study never counts', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 193'), choices: G }), 'electives').status).toBe('unmet')
  })

  it('MATH 11A paths need the Mathematics petition', () => {
    const t = swapIn(general, 'AM 11A', 'MATH 11A')
    expect(find(run(harness, { terms: t, choices: G, attested: [] }), 'math-petition-path').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swapIn(general, 'AM 11A', 'MATH 19A'), choices: G, attested: [] }), 'math').status).toBe('met')
  })

  it('comprehensive needs C/P or better in the core', () => {
    const r = run(harness, { terms: general, choices: G, grades: { 'ECON 100B': 'C-' } })
    expect(find(r, 'macro').status).toBe('met')
    expect(find(r, 'comp-macro').status).toBe('unmet')
    expect(find(run(harness, { terms: general, choices: G, grades: { 'ECON 100B': 'P' } }), 'comprehensive').status).toBe('met')
  })

  it('DC is ECON 104 or 197', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 104', 'ECON 197'), choices: G }), 'dc').status).toBe('met')
    expect(find(run(harness, { terms: drop(general, 'ECON 104'), choices: G }), 'dc').status).toBe('unmet')
  })
})

describe('business-management-economics-ba 2026-27 adversarial', () => {
  it('all three finance courses: one is finance, two count as business management', () => {
    // 133 (F) + 135, 101 (BM) + 110 (BM) + 140 (E)
    const t = swapIn(swapIn(general, 'ECON 136', 'ECON 135'), 'ECON 161A', 'ECON 101')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('met')
  })

  it('ECON 124 is a business elective, not an economics elective, in this major', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 124'), choices: G }), 'electives').status).toBe('unmet')
  })
})

describe('business-management-economics-ba 2026-27 accounting', () => {
  const acct = plan(
    ['2268', 'ECON 1', 'AM 11A', 'CSE 20'],
    ['2270', 'ECON 2', 'AM 11B', 'ECON 10A'],
    ['2272', 'STAT 17', 'STAT 17L', 'ECON 10B'],
    ['2278', 'ECON 100A', 'ECON 113', 'ECON 110'],
    ['2280', 'ECON 100B', 'ECON 104', 'ECON 111A'],
    ['2282', 'ECON 111B', 'ECON 111C', 'ECON 112'],
    ['2288', 'ECON 116', 'ECON 117A', 'ECON 117B'],
    ['2290', 'ECON 135', 'ECON 150'],
  )
  const A = { concentration: 'accounting' }

  it('complete accounting record (one computing course)', () => {
    expect(failing(run(harness, { terms: acct, choices: A }))).toEqual([])
  })

  it('needs all eight accounting courses', () => {
    expect(find(run(harness, { terms: drop(acct, 'ECON 116'), choices: A }), 'accounting').status).toBe('unmet')
  })

  it('economics elective list excludes ECON 190; ECON 199 may fill it', () => {
    expect(find(run(harness, { terms: swapIn(acct, 'ECON 150', 'ECON 190'), choices: A }), 'econ-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: swapIn(acct, 'ECON 150', 'ECON 199'), choices: A }), 'econ-elective').status).toBe('met')
  })

  it('needs a finance course', () => {
    expect(find(run(harness, { terms: drop(acct, 'ECON 135'), choices: A }), 'finance').status).toBe('unmet')
  })

  it('undeclared with one computing course and all accounting courses asks for the choice', () => {
    const r = run(harness, { terms: acct })
    expect(find(r, 'computing').status).toBe('needs-choice')
    expect(failing(r)).toEqual(['computing:needs-choice'])
  })

  it('accounting record is not complete as a general major (computing short)', () => {
    expect(find(run(harness, { terms: acct, choices: G }), 'computing').status).toBe('unmet')
  })

  it('general record plus all accounting courses still fine undeclared', () => {
    const t = add(general, 'ECON 111A', 'ECON 111B', 'ECON 111C', 'ECON 112', 'ECON 116', 'ECON 117A', 'ECON 117B')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })
})
