import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const base = plan(
  ['2268', 'HEBR 1', 'HIS 74'],
  ['2270', 'HEBR 2', 'HIS 76'],
  ['2272', 'HEBR 3'],
  ['2278', 'HIS 155', 'LIT 164C', 'HIS 2B'],
  ['2280', 'HIS 185J', 'PHIL 148', 'HIS 167B'],
  ['2282', 'HIS 178C', 'LIT 112I'],
  ['2288', 'HIS 196M'],
)
const swap = (from: string, to: string) => base.map((t) => ({ ...t, courses: t.courses.map((c) => (c === from ? to : c)) }))
const drop = (code: string) => base.map((t) => ({ ...t, courses: t.courses.filter((c) => c !== code) }))

describe('jewish-studies-ba 2025-26', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('language in any combination (Hebrew + Yiddish + Biblical Hebrew)', () => {
    const t = swap('HEBR 2', 'YIDD 1').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'HEBR 3' ? 'HEBR 80' : c)) }))
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('two language courses are not three', () => {
    expect(find(run(harness, { terms: drop('HEBR 3') }), 'language').status).toBe('unmet')
  })

  it('HIS 75 or HIS 76 is required in addition to the introductory core', () => {
    expect(find(run(harness, { terms: swap('HIS 76', 'HIS 74A') }), 'core-holocaust').status).toBe('unmet')
  })

  it('three upper-division core courses are not four', () => {
    expect(find(run(harness, { terms: swap('PHIL 148', 'HIS 70A') }), 'ud-core').status).toBe('unmet')
  })

  it('electives need three 5-credit upper-division courses', () => {
    const r = run(harness, { terms: swap('LIT 112I', 'HIS 70A') })
    expect(find(r, 'electives').status).toBe('unmet')
  })

  it('a fourth language course can be an elective', () => {
    expect(failing(run(harness, { terms: swap('HIS 2B', 'HEBR 4') }))).toEqual([])
  })

  it('exit seminars are not electives (only the listed electives and core/language courses)', () => {
    const t = [...swap('LIT 112I', 'HIS 194L'), { term: '2290', courses: [] }]
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('thesis JWST 195A + 195B satisfies comprehensive and DC; 195A alone does not', () => {
    expect(failing(run(harness, { terms: [...drop('HIS 196M'), { term: '2290', courses: ['JWST 195A', 'JWST 195B'] }] }))).toEqual([])
    const r = run(harness, { terms: [...drop('HIS 196M'), { term: '2290', courses: ['JWST 195A'] }] })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('a non-listed seminar is not the comprehensive', () => {
    expect(find(run(harness, { terms: swap('HIS 196M', 'HIS 194C') }), 'comprehensive').status).toBe('unmet')
  })

  it('the comprehensive cannot be P/NP', () => {
    expect(find(run(harness, { terms: base, grades: { 'HIS 196M': 'P' } }), 'comprehensive').status).toBe('unmet')
  })

  it('classical distribution: needs one listed course (HIS 74 covers it here)', () => {
    const r = run(harness, { terms: swap('HIS 74', 'HIS 74B') })
    expect(find(r, 'core-intro').status).toBe('met')
    expect(find(r, 'classical').status).toBe('unmet')
  })

  it('classical distribution may overlap a core course', () => {
    const r = run(harness, { terms: swap('HIS 74', 'HIS 74B').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'PHIL 148' ? 'LIT 118A' : c)) })) })
    expect(failing(r)).toEqual([])
  })

  it('independent study JWST 199: limit of one', () => {
    expect(failing(run(harness, { terms: swap('HIS 178C', 'JWST 199') }))).toEqual([])
    const two = swap('HIS 178C', 'JWST 199').map((q) => ({ ...q, courses: q.courses.map((c) => (c === 'LIT 112I' ? 'JWST 199' : c)) }))
    expect(find(run(harness, { terms: two }), 'electives').status).toBe('unmet')
  })

  it('up to two P/NP; three is too many', () => {
    expect(failing(run(harness, { terms: base, grades: { 'HEBR 1': 'P', 'HIS 2B': 'P' } }))).toEqual([])
    expect(find(run(harness, { terms: base, grades: { 'HEBR 1': 'P', 'HIS 2B': 'P', 'HIS 155': 'P' } }), 'pnp-limit').status).toBe('unmet')
  })
  it('review: without the language courses, the placement exam is asked (and only then)', () => {
    const t = base.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('HEBR')) }))
    expect(find(run(harness, { terms: t, attested: [] }), 'attest:language-placement').status).toBe('needs-attestation')
    expect(failing(run(harness, { terms: t, attested: ['language placement'] }))).toEqual([])
    expect(() => find(run(harness, { terms: base, attested: [] }), 'attest:language-placement')).toThrow()
  })

  it('review: a second lower-division elective breaks the three-upper-division rule', () => {
    expect(find(run(harness, { terms: swap('LIT 112I', 'HIS 75') }), 'electives').status).toBe('unmet')
  })

  it('review: HIS 75 and HIS 76 both taken: the second is an elective', () => {
    expect(failing(run(harness, { terms: swap('HIS 2B', 'HIS 75') }))).toEqual([])
  })

  it('review: a repeatable LIT 164G taken twice fills a core and an elective slot', () => {
    const t = swap('LIT 164C', 'LIT 164G').map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'LIT 112I') }))
    const r = run(harness, { terms: [...t, { term: '2290', courses: ['LIT 164G'] }] })
    expect(failing(r)).toEqual([])
    expect(find(r, 'electives').used?.map((e) => e.display)).toContain('LIT 164G')
  })
})
