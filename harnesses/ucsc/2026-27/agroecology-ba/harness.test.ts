import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2026 (CHEM 3B includes lab).
const base = plan(
  ['2268', 'CHEM 3A', 'ENVS 24', 'MATH 11A'],
  ['2270', 'CHEM 3B', 'ENVS 25', 'STAT 7', 'STAT 7L'],
  ['2272', 'ENVS 80F', 'SOCY 1'],
  ['2278', 'ENVS 130A', 'ENVS 130L', 'ENVS 83'],
  ['2280', 'ENVS 100', 'ENVS 100L', 'ENVS 130B'],
  ['2282', 'ENVS 133', 'ENVS 160'],
  ['2288', 'ENVS 161A', 'ENVS 163', 'ENVS 163L'],
  ['2290', 'CMMU 149', 'ENVS 190'],
)
const edit = (t: StudentRecord['terms'], from: string, ...to: string[]) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('agroecology-ba 2026-27', () => {
  it('complete record is met', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('ENVS 23 alone satisfies the physical-science option', () => {
    const t = edit(edit(base, 'CHEM 3A', 'ENVS 23'), 'CHEM 3B')
    expect(find(run(harness, { terms: t }), 'phys-sci').status).toBe('met')
  })

  it('CHEM 3B before fall 2026 also needs CHEM 3BL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'phys-sci').status).toBe('unmet')
    const withLab = edit(early, 'CHEM 3B', 'CHEM 3B', 'CHEM 3BL')
    expect(find(run(harness, { terms: withLab }), 'phys-sci').status).toBe('met')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(base, 'CHEM 3A', 'CHEM 4A', 'CHEM 4AL'), 'CHEM 3B', 'CHEM 4B')
    expect(find(run(harness, { terms: t }), 'phys-sci').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(t, 'CHEM 4B', 'CHEM 4B', 'CHEM 4BL') }), 'phys-sci').status).toBe('met')
  })

  it('math may be satisfied by an AP Calculus / ALEKS score (attestation)', () => {
    const t = edit(base, 'MATH 11A')
    expect(find(run(harness, { terms: t, attested: [] }), 'math').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['ALEKS'] }), 'math').status).toBe('met')
  })

  it('statistics series needs the lab too', () => {
    expect(find(run(harness, { terms: edit(base, 'STAT 7L') }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(edit(base, 'STAT 7', 'STAT 17'), 'STAT 7L', 'STAT 17L') }), 'stats').status).toBe('met')
  })

  it('no letter-grade policy: P counts for major courses', () => {
    const r = run(harness, { terms: base, grades: { 'ENVS 160': 'P', 'ENVS 25': 'P' } })
    expect(failing(r)).toEqual([])
  })

  it('comprehensive course must be taken for a letter grade', () => {
    const r = run(harness, { terms: base, grades: { 'ENVS 190': 'P' } })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
  })

  it('needs a practicum course (ENVS 130C/133/133B/135)', () => {
    const r = run(harness, { terms: edit(base, 'ENVS 133', 'ENVS 162') })
    expect(find(r, 'practicum-electives').status).toBe('unmet')
  })

  it('needs four electives beyond the practicum', () => {
    expect(find(run(harness, { terms: edit(base, 'CMMU 149') }), 'practicum-electives').status).toBe('unmet')
  })

  it('ENVS 133 and ENVS 133B may not both be counted', () => {
    const r = run(harness, { terms: edit(base, 'CMMU 149', 'ENVS 133B') })
    expect(find(r, 'practicum-electives').status).toBe('unmet')
  })

  it('a second practicum course may count as an elective', () => {
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'ENVS 135') }), 'practicum-electives').status).toBe('met')
  })

  it('ENVS 183A or 195A, but not both', () => {
    const t = edit(edit(base, 'CMMU 149', 'ENVS 183A'), 'ENVS 160', 'ENVS 195A')
    expect(find(run(harness, { terms: t }), 'practicum-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'ENVS 183A') }), 'practicum-electives').status).toBe('met')
  })

  it('a lab alone is not an elective; lecture + lab count as one', () => {
    expect(find(run(harness, { terms: edit(base, 'ENVS 163', 'ENVS 142') }), 'practicum-electives').status).toBe('met')
    // 163L without its lecture does not count
    const t = edit(base, 'ENVS 163')
    expect(find(run(harness, { terms: t }), 'practicum-electives').status).toBe('unmet')
  })

  it('elective not on the list does not count (ENVS 104)', () => {
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'ENVS 104') }), 'practicum-electives').status).toBe('unmet')
  })

  it('internship / independent study is required', () => {
    expect(find(run(harness, { terms: edit(base, 'ENVS 83') }), 'internship').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'ENVS 83', 'ENVS 199F') }), 'internship').status).toBe('met')
  })

  it('DC needs a senior course; ENVS 183A alone is not one', () => {
    const r = run(harness, { terms: edit(base, 'ENVS 190', 'ENVS 183A') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('LGST 130B is the same course as ENVS 130B', () => {
    expect(failing(run(harness, { terms: edit(base, 'ENVS 130B', 'LGST 130B') }))).toEqual([])
  })

  it('ENVS 130L is required with ENVS 130A', () => {
    expect(find(run(harness, { terms: edit(base, 'ENVS 130L') }), 'ud-core').status).toBe('unmet')
  })

  it('LGST 165A is the same course as elective ENVS 165', () => {
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'LGST 165A') }), 'practicum-electives').status).toBe('met')
  })

  it('repeating ENVS 133 does not fill a second elective slot', () => {
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'ENVS 133') }), 'practicum-electives').status).toBe('unmet')
  })
  it('review (§1a petition path): one unlisted ENVS 104–179 or UD SOCY/LALS/ANTH elective needs an approved petition', () => {
    // "Students in the agroecology B.A may petition to substitute one of the four agroecology upper-division elective courses from:"
    const one = edit(base, 'CMMU 149', 'ENVS 156')
    expect(find(run(harness, { terms: one, attested: [] }), 'practicum-electives').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: one, attested: ['elective petition'] }), 'practicum-electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'SOCY 130') }), 'practicum-electives').status).toBe('met')
    // only one substitution
    const two = edit(edit(base, 'CMMU 149', 'ENVS 156'), 'ENVS 160', 'SOCY 130')
    expect(find(run(harness, { terms: two }), 'practicum-electives').status).toBe('unmet')
    // a lower-division course is not a substitute; not asked when the list suffices
    expect(find(run(harness, { terms: edit(base, 'CMMU 149', 'SOCY 15') }), 'practicum-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: [...base, { term: '2292', courses: ['ENVS 156'] }], attested: [] }), 'practicum-electives').status).toBe('met')
  })
  it('review (§1a): ALEKS is offered only when no math course is in the plan', () => {
    expect(find(run(harness, { terms: base, grades: { 'MATH 11A': 'F' }, attested: [] }), 'math').status).toBe('unmet')
  })
  it('review: a graduate seminar by instructor invitation can be the comprehensive', () => {
    // "Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor."
    const t = edit(base, 'ENVS 190', 'ENVS 290')
    expect(find(run(harness, { terms: t, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['graduate seminar'] }), 'comprehensive').status).toBe('met')
    expect(find(run(harness, { terms: t, grades: { 'ENVS 290': 'P' } }), 'comprehensive').status).toBe('unmet')
  })
  it('review: ENVS 133 as the practicum and ENVS 133B as an elective cannot both count', () => {
    const r = run(harness, { terms: edit(base, 'CMMU 149', 'ENVS 133B') })
    expect(failing(r)).toEqual(['practicum-electives:unmet'])
  })
})
