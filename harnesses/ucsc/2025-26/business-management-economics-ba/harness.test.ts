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

describe('business-management-economics-ba 2025-26 general', () => {
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

  it('CSE 20 test-out (attestation) counts as one computer-literacy course', () => {
    // "CSE 20 has a test out option which counts as one of the two required courses."
    const noCse20 = drop(general, 'CSE 20')
    expect(find(run(harness, { terms: noCse20, choices: G, attested: ['cse20-testout'] }), 'computing').status).toBe('met')
    const r = run(harness, { terms: noCse20, choices: G, attested: [] })
    expect(find(r, 'computing-or-testout').status).toBe('needs-attestation')
    expect(find(r, 'computing').status).toBe('unmet')
  })

  it('CSE 20 test-out is not offered when CSE 20 is in the plan', () => {
    const r = run(harness, { terms: drop(general, 'TIM 50'), choices: G, attested: 'all' })
    expect(find(r, 'computing').status).toBe('unmet')
    expect(() => find(r, 'computing-or-testout')).toThrow()
  })

  it('test-out cannot replace both computer-literacy courses', () => {
    const t = drop(drop(general, 'CSE 20'), 'TIM 50')
    expect(find(run(harness, { terms: t, choices: G, attested: 'all' }), 'computing').status).toBe('unmet')
  })

  it('CSE 13S and ECE 13 are the same course for credit', () => {
    const t = swapIn(swapIn(general, 'CSE 20', 'CSE 13S'), 'TIM 50', 'ECE 13')
    expect(find(run(harness, { terms: t, choices: G, attested: [] }), 'computing').status).toBe('unmet')
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

  it('only one of ECON 130, 159, 160A, 160B', () => {
    // 159 as a business course and 130 as the economics elective: two of the five
    const t = swapIn(swapIn(general, 'ECON 161A', 'ECON 159'), 'ECON 140', 'ECON 130')
    const n = find(run(harness, { terms: t, choices: G }), 'electives')
    expect(n.status).toBe('unmet')
    // one of them is fine
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 130'), choices: G }), 'electives').status).toBe('met')
  })

  it('2025-26: ECON 188 is outside the "only one of" cap (business 188 + economics 130 is fine)', () => {
    const t = swapIn(swapIn(general, 'ECON 161A', 'ECON 188'), 'ECON 140', 'ECON 130')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('met')
  })

  it('2025-26: ECON 188 is a business elective but not an economics elective', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 161A', 'ECON 188'), choices: G }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 188'), choices: G }), 'electives').status).toBe('unmet')
  })

  it('2025-26: CRWN 152 is not a business management elective', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 161A', 'CRWN 152'), choices: G }), 'electives').status).toBe('unmet')
  })

  it('cross-listed LGST 160A counts as ECON 160A', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'LGST 160A'), choices: G }), 'electives').status).toBe('met')
  })

  it('ECON 195/199 fills the economics elective', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 199'), choices: G }), 'electives').status).toBe('met')
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

describe('business-management-economics-ba 2025-26 adversarial', () => {
  it('ECON 195 replacing a business elective is not called unmet (page: "one of the five")', () => {
    const r = run(harness, { terms: swapIn(general, 'ECON 161A', 'ECON 195'), choices: G })
    expect(find(r, 'electives').status).toBe('cannot-check')
  })

  it('review: LGST 160A + ECON 160A are one course in the lenient fallback too', () => {
    // 195 stands in for a business elective; 160A entered under both codes must not count twice
    const t = swapIn(swapIn(swapIn(general, 'ECON 161A', 'ECON 195'), 'ECON 136', 'ECON 160A'), 'ECON 110', 'LGST 160A')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('unmet')
  })

  it('review: LGST 160A (cross-listed) as a business elective satisfies the category check', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 136', 'LGST 160A'), choices: G }), 'electives').status).toBe('met')
  })

  it('review: ECON 160A and LGST 160A are one course for "only one of"', () => {
    const t = swapIn(swapIn(general, 'ECON 136', 'ECON 160A'), 'ECON 161A', 'LGST 160A')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('unmet')
  })

  it('a plain math package wins over a petition package', () => {
    const t = add(general, 'MATH 11A', 'MATH 11B', 'MATH 22')
    const r = run(harness, { terms: t, choices: G, attested: [] })
    expect(find(r, 'math').status).toBe('met')
    expect(() => find(r, 'math-petition-path')).toThrow()
  })

  it('MATH 19A + AM 11B needs no petition; MATH 19A/19B/23A does', () => {
    const t = swapIn(general, 'AM 11A', 'MATH 19A')
    expect(failing(run(harness, { terms: t, choices: G, attested: [] }))).toEqual([])
    const p = add(drop(drop(general, 'AM 11A'), 'AM 11B'), 'MATH 19A', 'MATH 19B', 'MATH 23A')
    expect(failing(run(harness, { terms: p, choices: G, attested: [] }))).toEqual(['attest:math-petition:needs-attestation'])
  })

  it('STAT 17 without its lab is not enough', () => {
    expect(find(run(harness, { terms: drop(general, 'STAT 17L'), choices: G }), 'stats').status).toBe('unmet')
  })

  it('P grades count toward the major (P also satisfies the comprehensive C/P rule)', () => {
    const r = run(harness, { terms: general, choices: G, grades: { 'ECON 136': 'P', 'ECON 1': 'P', 'ECON 113': 'P' } })
    expect(failing(r)).toEqual([])
  })

  it('ECON 116 is an accounting-concentration course, not a business elective', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 136', 'ECON 116'), choices: G }), 'electives').status).toBe('unmet')
  })

  it('empty plan: everything unmet, nothing met', () => {
    const r = run(harness, { terms: [], choices: G, attested: [] })
    expect(r.status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('kitchen sink general record is complete', () => {
    const t = add(general, 'ECON 101', 'ECON 130', 'ECON 159', 'ECON 195', 'ECON 199', 'ECON 193', 'MATH 19A', 'MATH 19B', 'AM 30', 'CSE 30', 'ECE 13', 'CSE 13S')
    expect(failing(run(harness, { terms: t, choices: G, attested: [] }))).toEqual([])
  })

  it('all three finance courses: one is finance, two count as business management', () => {
    // 133 (F) + 135, 101 (BM) + 110 (BM) + 140 (E)
    const t = swapIn(swapIn(general, 'ECON 136', 'ECON 135'), 'ECON 161A', 'ECON 101')
    expect(find(run(harness, { terms: t, choices: G }), 'electives').status).toBe('met')
  })

  it('ECON 124 is a business elective, not an economics elective, in this major', () => {
    expect(find(run(harness, { terms: swapIn(general, 'ECON 140', 'ECON 124'), choices: G }), 'electives').status).toBe('unmet')
  })
})

describe('business-management-economics-ba 2025-26 accounting', () => {
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

  it('accounting: the CSE 20 test-out alone covers computer literacy', () => {
    // "CSE 20 has a test out option which may count as the required course."
    const t = drop(acct, 'CSE 20')
    expect(find(run(harness, { terms: t, choices: A, attested: ['cse20-testout'] }), 'computing').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: A, attested: [] }), 'computing-or-testout').status).toBe('needs-attestation')
  })

  it('accounting: the general-only "only one of 130/159/160A/160B" does not bind; econ elective 130 is fine', () => {
    expect(find(run(harness, { terms: swapIn(acct, 'ECON 150', 'ECON 130'), choices: A }), 'econ-elective').status).toBe('met')
  })

  it('2025-26: accounting economics-elective list excludes ECON 188', () => {
    expect(find(run(harness, { terms: swapIn(acct, 'ECON 150', 'ECON 188'), choices: A }), 'econ-elective').status).toBe('unmet')
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
