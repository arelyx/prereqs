import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// Foreign-language path (SPAN 5); seven named courses; three electives
// (LING 117, 118, 119); capstone LING 190 with LING 119 after the DC.
const base = plan(
  ['2268', 'LING 50', 'SPAN 4'],
  ['2270', 'LING 53', 'SPAN 5'],
  ['2278', 'LING 100', 'LING 101'],
  ['2280', 'LING 112', 'LING 171'],
  ['2282', 'LING 102', 'LING 113'],
  ['2288', 'LING 116', 'LING 117', 'LING 118'],
  ['2290', 'LING 119', 'LING 190'],
)
type T = typeof base
const swap = (t: T, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const noSpanish = (t: T) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('SPAN')) }))

describe('linguistics-ba 2026-27', () => {
  it('complete record (foreign language) is met', () => {
    expect(failing(run(harness, { terms: base }))).toEqual([])
  })

  it('level 4 only: a sequence stopped short does not demonstrate level 5', () => {
    const t = swap(base, 'SPAN 5', null)
    expect(find(run(harness, { terms: t }), 'competency').status).toBe('unmet')
  })

  it('placed beyond level 5 (no lower-division language): equivalent is a confirmation', () => {
    const t = [...noSpanish(base), { term: '2292', courses: ['SPAN 114'] }]
    expect(find(run(harness, { terms: t, attested: [] }), 'competency').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, attested: ['placement'] }))).toEqual([])
    // declared language option with nothing in the plan
    expect(find(run(harness, { terms: noSpanish(base), choices: { competency: 'foreign language' }, attested: [] }), 'competency').status).toBe('needs-attestation')
  })

  it('SPAN 6 or SPHS 5 shows level 5', () => {
    expect(failing(run(harness, { terms: swap(base, 'SPAN 5', 'SPAN 6'), attested: [] }))).toEqual([])
    expect(failing(run(harness, { terms: swap(swap(base, 'SPAN 5', 'SPHS 5'), 'SPAN 4', null), attested: [] }))).toEqual([])
  })

  it('option 2: Arabic level 3 + level 3 of a second language', () => {
    const t = swap(swap(base, 'SPAN 4', 'ARBC 3'), 'SPAN 5', 'FREN 3')
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual([])
    // two of the not-to-5 languages also works
    expect(failing(run(harness, { terms: swap(swap(base, 'SPAN 4', 'ARBC 3'), 'SPAN 5', 'YIDD 3'), attested: [] }))).toEqual([])
    // French level 3 + Spanish level 3 is not option 2 (neither is Arabic/Hebrew/Punjabi/Yiddish)
    expect(find(run(harness, { terms: swap(swap(base, 'SPAN 4', 'SPAN 3'), 'SPAN 5', 'FREN 3'), attested: [] }), 'competency').status).not.toBe('met')
  })

  it('option 3: Latin 1, 2 and a LIT 186-series course', () => {
    const t = swap(swap(base, 'SPAN 4', 'LATN 1'), 'SPAN 5', 'LATN 2')
    expect(find(run(harness, { terms: t, attested: [] }), 'competency').status).not.toBe('met')
    const t2 = [...t, { term: '2292', courses: ['LIT 186A'] }]
    expect(failing(run(harness, { terms: t2, attested: [] }))).toEqual([])
  })

  it('math/CS: two listed courses', () => {
    const t = [...noSpanish(base), { term: '2292', courses: ['CSE 20', 'STAT 5'] }]
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('math/CS: only one course fails (no language attestation offered without language courses)', () => {
    const t = [...noSpanish(base), { term: '2292', courses: ['CSE 20'] }]
    expect(failing(run(harness, { terms: t }))).toContain('math-cs:unmet')
    expect(find(run(harness, { terms: t }), 'competency').status).toBe('unmet')
  })

  it('math/CS: PSYC 2 substitutes for STAT 5 but both do not count', () => {
    const t = [...noSpanish(base), { term: '2292', courses: ['PSYC 2', 'STAT 5'] }]
    expect(find(run(harness, { terms: t }), 'competency').status).toBe('unmet')
    const t2 = [...noSpanish(base), { term: '2292', courses: ['PSYC 2', 'PHIL 9'] }]
    expect(failing(run(harness, { terms: t2 }))).toEqual([])
  })

  it('math/CS: a course with a listed prerequisite counts', () => {
    const t = [...noSpanish(base), { term: '2292', courses: ['CSE 20', 'CSE 30'] }]
    expect(failing(run(harness, { terms: t }))).toEqual([])
    // CSE 30 has CSE 20 as a prerequisite; MATH 19A has none of the listed courses
    const t2 = [...noSpanish(base), { term: '2292', courses: ['CSE 20', 'MATH 19A'] }]
    expect(find(run(harness, { terms: t2 }), 'competency').status).toBe('unmet')
  })

  it('STAT 7 lecture without its lab counts', () => {
    const t = [...noSpanish(base), { term: '2292', courses: ['STAT 7', 'PHIL 9'] }]
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('LING 171 is required', () => {
    expect(failing(run(harness, { terms: swap(base, 'LING 171', 'LING 120') }))).toEqual(['core/LING171:unmet'])
  })

  it('three of LING 102/113/116/151/172', () => {
    expect(failing(run(harness, { terms: swap(base, 'LING 116', 'LING 120') }))).toEqual(['three:unmet'])
  })

  it('a fourth advanced course can be an elective', () => {
    expect(failing(run(harness, { terms: swap(base, 'LING 117', 'LING 151') }))).toEqual([])
  })

  it('LING 171 / LING 111 do not count as electives', () => {
    expect(find(run(harness, { terms: swap(base, 'LING 117', 'LING 111') }), 'electives').status).toBe('unmet')
  })

  it('an outside upper-division course is cannot-check', () => {
    expect(find(run(harness, { terms: swap(base, 'LING 117', 'PHIL 123') }), 'electives').status).toBe('cannot-check')
  })

  it('senior thesis LING 195 counts as an elective and the comprehensive', () => {
    const t = swap(swap(base, 'LING 190', 'LING 195'), 'LING 119', null)
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
  })

  it('LING 190 needs a concurrent upper-division elective', () => {
    const t = swap(base, 'LING 119', null).map((q) => (q.term === '2288' ? { ...q, courses: [...q.courses, 'LING 119'] } : q))
    const r = run(harness, { terms: t })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('comprehensive before the DC does not count', () => {
    const t = plan(
      ['2268', 'LING 50', 'SPAN 4'],
      ['2270', 'LING 53', 'SPAN 5', 'LING 119', 'LING 190'],
      ['2278', 'LING 100', 'LING 101'],
      ['2280', 'LING 112', 'LING 171'],
      ['2282', 'LING 102', 'LING 113'],
      ['2288', 'LING 116', 'LING 117', 'LING 118'],
    )
    expect(find(run(harness, { terms: t }), 'comprehensive').status).toBe('unmet')
  })

  it('DC needs LING 101 and LING 111/112', () => {
    const r = run(harness, { terms: swap(base, 'LING 112', 'LING 111') })
    expect(failing(r)).toEqual([])
  })

  it('P/NP allowed', () => {
    expect(failing(run(harness, { terms: base, grades: { 'LING 102': 'P', 'LING 171': 'P' } }))).toEqual([])
  })
})
