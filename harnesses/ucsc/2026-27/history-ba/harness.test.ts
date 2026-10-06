import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'HIS 70A', 'HIS 10A'],
  ['2270', 'HIS 40A'],
  ['2278', 'HIS 100', 'HIS 160A'],
  ['2280', 'HIS 172A', 'HIS 104C', 'HIS 150B'],
  ['2282', 'HIS 178A', 'HIS 101D'],
  ['2288', 'HIS 185J', 'HIS 196G'],
)
const choices = {
  track: 'general',
  region: 'Europe and the Mediterranean World',
  europe_courses: 'HIS 160A, HIS 172A, HIS 178A, HIS 185J, HIS 196G',
  americas_courses: 'HIS 104C',
  asia_courses: 'HIS 150B, HIS 101D',
  pre1800_courses: 'HIS 160A, HIS 70A',
}
const swap = (from: string, to: string, t = base) => t.map((q) => ({ ...q, courses: q.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string, t = base) => t.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== code) }))

describe('history-ba 2026-27 — general', () => {
  it('complete record with region lists is met', () => {
    const r = run(harness, { terms: base, choices })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('region must be chosen first', () => {
    expect(find(run(harness, { terms: base }), 'choice:region').status).toBe('needs-choice')
  })

  it('without the region lists, region rules are cannot-check, never met or unmet', () => {
    const r = run(harness, { terms: base, choices: { region: 'europe' } })
    expect(find(r, 'concentration').status).toBe('cannot-check')
    expect(find(r, 'breadth').status).toBe('cannot-check')
    expect(find(r, 'comprehensive').status).toBe('cannot-check')
    expect(find(r, 'pre1800').status).toBe('cannot-check')
    expect(find(r, 'survey').status).toBe('met')
    expect(find(r, 'his100').status).toBe('met')
  })

  it('survey must be from the chosen region', () => {
    const r = run(harness, { terms: swap('HIS 70A', 'HIS 11A'), choices: { ...choices, pre1800_courses: 'HIS 160A, HIS 178A' } })
    expect(find(r, 'survey').status).toBe('unmet')
  })

  it('HIS 31A is a survey for both Americas/Africa and Europe/Mediterranean', () => {
    const t = swap('HIS 70A', 'HIS 31A')
    expect(find(run(harness, { terms: t, choices }), 'survey').status).toBe('met')
    expect(find(run(harness, { terms: swap('HIS 10A', 'HIS 31A', swap('HIS 40A', 'HIS 40B')), choices: { ...choices, region: 'americas', americas_courses: 'HIS 104C, HIS 160A, HIS 172A, HIS 178A' } }), 'survey').status).toBe('met')
  })

  it('HIS 100 is required', () => {
    expect(find(run(harness, { terms: swap('HIS 100', 'HIS 167A'), choices: { ...choices, europe_courses: choices.europe_courses + ', HIS 167A' } }), 'his100').status).toBe('unmet')
  })

  it('only three additional region courses is not four', () => {
    const r = run(harness, { terms: drop('HIS 185J'), choices })
    expect(find(r, 'concentration').status).toBe('unmet')
  })

  it('two lower-division courses in the region (survey + one) are allowed; three are not', () => {
    // HIS 70B as a 2nd region LD course replaces HIS 185J; the breadth then needs two UD (it has 104C + 150B).
    const two = swap('HIS 185J', 'HIS 70B')
    expect(failing(run(harness, { terms: two, choices }))).toEqual([])
    const three = swap('HIS 178A', 'HIS 41', two)
    expect(find(run(harness, { terms: three, choices: { ...choices, pre1800_courses: 'HIS 160A, HIS 70A' } }), 'concentration').status).toBe('unmet')
  })

  it('breadth: two lower-division concentration courses require two UD breadth courses', () => {
    const t = swap('HIS 104C', 'HIS 10B', swap('HIS 185J', 'HIS 70B'))
    const r = run(harness, { terms: t, choices })
    expect(find(r, 'breadth').status).toBe('unmet')
    // With four UD concentration courses, one UD breadth course is enough.
    expect(find(run(harness, { terms: swap('HIS 104C', 'HIS 10B'), choices }), 'breadth').status).toBe('met')
  })

  it('breadth needs two from EACH other region, not three and one', () => {
    const t = swap('HIS 40A', 'HIS 11A')
    const r = run(harness, { terms: t, choices: { ...choices, asia_courses: 'HIS 150B', americas_courses: 'HIS 104C, HIS 101D' } })
    expect(find(r, 'breadth').status).toBe('unmet')
  })

  it('breadth needs at least one 5-credit upper-division course', () => {
    const t = swap('HIS 104C', 'HIS 10B', swap('HIS 150B', 'HIS 44'))
    expect(find(run(harness, { terms: t, choices }), 'breadth').status).toBe('unmet')
  })

  it('comprehensive seminar must be in the region of concentration', () => {
    const r = run(harness, { terms: swap('HIS 196G', 'HIS 194C'), choices: { ...choices, asia_courses: 'HIS 150B, HIS 101D, HIS 194C' } })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('comprehensive cannot be P/NP', () => {
    expect(find(run(harness, { terms: base, choices, grades: { 'HIS 196G': 'P' } }), 'comprehensive').status).toBe('unmet')
  })

  it('thesis (HIS 195A + 195B) with a prior region seminar counts as the comprehensive', () => {
    // HIS 196G now fills the fourth concentration course; the thesis is the comprehensive.
    const t = [...drop('HIS 185J'), { term: '2290', courses: ['HIS 195A', 'HIS 195B'] }]
    const r = run(harness, { terms: t, choices, attested: ['senior check-in'] })
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'thesis-seminar').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('thesis without a region seminar needs the petitioned exception', () => {
    const t = [...drop('HIS 196G'), { term: '2290', courses: ['HIS 195A', 'HIS 195B'] }]
    const r = run(harness, { terms: t, choices, attested: ['senior check-in'] })
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'attest:thesis-exception').status).toBe('needs-attestation')
  })

  it('pre-1800: only one listed course is not two', () => {
    expect(find(run(harness, { terms: base, choices: { ...choices, pre1800_courses: 'HIS 160A' } }), 'pre1800').status).toBe('unmet')
  })

  it('elective must be a 5-credit upper-division history course', () => {
    const r = run(harness, { terms: swap('HIS 101D', 'LIT 61J'), choices: { ...choices, asia_courses: 'HIS 150B' } })
    // With nothing left over, the elective or a breadth slot goes short.
    expect(r.status).toBe('unmet')
    expect(failing(r).some((f) => /electives|breadth/.test(f))).toBe(true)
    // A fourth lower-division course is fine when the rules allow it (HIS 2A listed under Asia/Pacific).
    expect(failing(run(harness, { terms: swap('HIS 101D', 'HIS 2A'), choices: { ...choices, asia_courses: 'HIS 150B, HIS 2A' } }))).toEqual([])
  })

  it('two P/NP courses are fine; three are not', () => {
    expect(failing(run(harness, { terms: base, choices, grades: { 'HIS 10A': 'P', 'HIS 101D': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, choices, grades: { 'HIS 10A': 'P', 'HIS 101D': 'P', 'HIS 160A': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })

  it('senior check-in is an attestation', () => {
    expect(find(run(harness, { terms: base, choices, attested: [] }), 'attest:senior-check-in').status).toBe('needs-attestation')
  })
})

describe('history-ba 2026-27 — intensive', () => {
  const t = [...base, { term: '2290', courses: ['HIS 190G', 'HIS 194L', 'HIS 178B', 'SPAN 1', 'SPAN 2', 'SPAN 3'] }]
  const ic = { ...choices, track: 'intensive', europe_courses: choices.europe_courses + ', HIS 194L', americas_courses: 'HIS 104C, HIS 190G', europe_extra: '' }

  it('complete intensive record is met', () => {
    const r = run(harness, { terms: t, choices: ic })
    expect(failing(r)).toEqual([])
  })

  it('intensive needs four electives (twelve courses are not enough)', () => {
    expect(find(run(harness, { terms: base, choices: { ...choices, track: 'intensive' } }), 'electives').status).toBe('unmet')
  })

  it('three advanced-research courses are required', () => {
    const r = run(harness, { terms: swap('HIS 190G', 'HIS 167A', t), choices: ic })
    expect(find(r, 'electives').status).toBe('met')
    expect(find(r, 'advanced').status).toBe('unmet')
  })

  it('the thesis counted as one advanced-research course leaves it open, not failed, when it would decide', () => {
    // Comprehensive = thesis; HIS 194L is the only seminar: 1 + thesis = 2, or 3 if the thesis is two.
    const th = [...swap('HIS 190G', 'HIS 176', swap('HIS 196G', 'HIS 167A', t)), { term: '2292', courses: ['HIS 195A', 'HIS 195B'] }].map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'HIS 185J') }))
    const r = run(harness, { terms: th, choices: { ...ic, europe_courses: 'HIS 160A, HIS 172A, HIS 178A, HIS 194L, HIS 167A' } })
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'advanced').status).toBe('cannot-check')
    // With a second seminar it is met outright.
    const th2 = th.map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'HIS 176' ? 'HIS 196E' : c)) }))
    expect(find(run(harness, { terms: th2, choices: { ...ic, europe_courses: 'HIS 160A, HIS 172A, HIS 178A, HIS 194L, HIS 167A' } }), 'advanced').status).toBe('met')
  })

  it('only one HIS 199 counts among the electives', () => {
    const two = swap('HIS 178B', 'HIS 199', swap('HIS 190G', 'HIS 199', t))
    expect(find(run(harness, { terms: two, choices: ic }), 'electives').status).toBe('unmet')
  })

  it('HIS 199 counts as advanced research', () => {
    expect(find(run(harness, { terms: swap('HIS 190G', 'HIS 199', t), choices: ic }), 'advanced').status).toBe('met')
  })

  it('language: three quarters of one language; mixed languages need the alternative', () => {
    const mixed = swap('SPAN 3', 'FREN 1', t)
    expect(find(run(harness, { terms: mixed, choices: ic, attested: ['senior check-in'] }), 'language').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap('SPAN 1', 'SPAN 4', t), choices: ic }), 'language').status).toBe('met')
    // Heritage Spanish continues Spanish; LATN 1–2 + LIT 186A is three quarters of Latin.
    expect(find(run(harness, { terms: swap('SPAN 3', 'SPHS 4', t), choices: ic, attested: [] }), 'language').status).toBe('met')
    const latin = swap('SPAN 1', 'LATN 1', swap('SPAN 2', 'LATN 2', swap('SPAN 3', 'LIT 186A', t)))
    expect(find(run(harness, { terms: latin, choices: ic, attested: [] }), 'language').status).toBe('met')
  })
})

describe('history-ba 2026-27 — review', () => {
  it('review: a cross-listed partner on the transcript (LIT 159M) matches the code listed (HIS 159M)', () => {
    const r = run(harness, { terms: swap('HIS 185J', 'LIT 159M'), choices: { ...choices, europe_courses: 'HIS 160A, HIS 172A, HIS 178A, HIS 159M, HIS 196G' } })
    expect(failing(r)).toEqual([])
  })

  it('review: an undeclared cross-listed history course (LIT 159M = HIS 159M) leaves the region open, not unmet', () => {
    expect(find(run(harness, { terms: swap('HIS 185J', 'LIT 159M'), choices }), 'concentration').status).toBe('cannot-check')
  })

  it('review: breadth 3 + 1 is not accepted when one of the three is listed under its cross-listed code', () => {
    // LIT 141B is listed as HIS 141A (Asia); with HIS 101D and the HIS 40A survey that is three Asia courses and only one Americas.
    const t = drop('HIS 10A', swap('HIS 150B', 'LIT 141B'))
    const r = run(harness, { terms: t, choices: { ...choices, asia_courses: 'HIS 101D, HIS 141A' } })
    expect(find(r, 'breadth').status).toBe('unmet')
  })

  it('review: an independent study counted toward the major asks for the substitution petition', () => {
    const t = swap('HIS 101D', 'HIS 199')
    const c = { ...choices, asia_courses: 'HIS 150B' }
    expect(find(run(harness, { terms: t, choices: c, attested: ['senior check-in'] }), 'attest:independent-study-petition').status).toBe('needs-attestation')
    expect(() => find(run(harness, { terms: base, choices, attested: [] }), 'attest:independent-study-petition')).toThrow()
  })

  it('review: a repeatable topics seminar counted twice is open (cannot-check), not unmet', () => {
    const t = [...drop('HIS 185J'), { term: '2290', courses: ['HIS 196G'] }]
    expect(find(run(harness, { terms: t, choices }), 'unique').status).toBe('cannot-check')
  })

  it('review: a non-repeatable course retaken still counts once', () => {
    const t = [...drop('HIS 185J'), { term: '2290', courses: ['HIS 172A'] }]
    expect(find(run(harness, { terms: t, choices }), 'concentration').status).toBe('unmet')
  })

  it('review: HIS 198 field study is not advanced research (the page names HIS 199)', () => {
    const t = [...base, { term: '2290', courses: ['HIS 198', 'HIS 194L', 'HIS 178B', 'SPAN 1', 'SPAN 2', 'SPAN 3'] }]
    const ic = { ...choices, track: 'intensive', europe_courses: choices.europe_courses + ', HIS 194L' }
    expect(find(run(harness, { terms: t, choices: ic }), 'advanced').status).not.toBe('met')
    expect(find(run(harness, { terms: swap('HIS 198', 'HIS 199', t), choices: ic }), 'advanced').status).toBe('met')
  })

  it('review: the language alternative is asked only when the three quarters are missing', () => {
    const t = [...base, { term: '2290', courses: ['HIS 190G', 'HIS 194L', 'HIS 178B', 'SPAN 1', 'SPAN 2', 'SPAN 3'] }]
    const ic = { ...choices, track: 'intensive', europe_courses: choices.europe_courses + ', HIS 194L', americas_courses: 'HIS 104C, HIS 190G' }
    expect(() => find(run(harness, { terms: t, choices: ic, attested: [] }), 'attest:language-alternative')).toThrow()
    const none = t.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('SPAN')) }))
    expect(find(run(harness, { terms: none, choices: ic, attested: [] }), 'attest:language-alternative').status).toBe('needs-attestation')
  })
})

