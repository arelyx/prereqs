import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// LALS major: intro + LD elective + LALS 100/100A/100L + five UD electives + seminar & lab.
const major = plan(
  ['2268', 'LALS 1', 'LALS 30'],
  ['2278', 'LALS 100', 'LALS 100A', 'LALS 100L'],
  ['2280', 'LALS 113', 'LALS 122'],
  ['2282', 'LALS 135', 'LALS 143'],
  ['2288', 'LALS 158', 'LALS 194A', 'LALS 194L'],
)
const swap = (terms: typeof major, from: string, ...to: string[]) =>
  terms.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('latin-american-and-latino-studies-ba 2026-27 major', () => {
  it('complete record (default: LALS major)', () => {
    expect(failing(run(harness, { terms: major }))).toEqual([])
    expect(failing(run(harness, { terms: major, choices: { concentration: 'LALS Major' } }))).toEqual([])
  })

  it('a second introductory course can be the lower-division elective', () => {
    expect(find(run(harness, { terms: swap(major, 'LALS 30', 'LALS 10') }), 'ld-elective').status).toBe('met')
  })

  it('2-credit lower-division courses do not count as the elective', () => {
    expect(find(run(harness, { terms: swap(major, 'LALS 30', 'LALS 95'), attested: [] }), 'ld-elective').status).toBe('needs-attestation')
  })

  it('needs five upper-division electives; the senior seminar is not one of them', () => {
    const r = run(harness, { terms: swap(major, 'LALS 158') })
    expect(find(r, 'ud-electives').status).toBe('unmet')
    expect(find(r, 'seminar').status).toBe('met')
  })

  it('a second senior seminar can be an elective', () => {
    expect(failing(run(harness, { terms: swap(major, 'LALS 158', 'LALS 194B') }))).toEqual([])
  })

  it('seminar lab LALS 194L is required (and not an elective)', () => {
    const r = run(harness, { terms: swap(major, 'LALS 194L') })
    expect(find(r, 'seminar').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('DC needs LALS 100L', () => {
    const r = run(harness, { terms: swap(major, 'LALS 100L') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'core').status).toBe('unmet')
  })

  it('C or better or P: a C- does not count, a P does', () => {
    expect(find(run(harness, { terms: major, grades: { 'LALS 143': 'C-' } }), 'ud-electives').status).toBe('unmet')
    expect(failing(run(harness, { terms: major, grades: { 'LALS 143': 'P' } }))).toEqual([])
  })

  it('an unused outside upper-division course makes a short elective cannot-check, not unmet', () => {
    const r = run(harness, { terms: swap(major, 'LALS 158', 'HIS 140B') })
    expect(find(r, 'ud-electives').status).toBe('cannot-check')
  })

  it('outside courses cannot cover more than two electives', () => {
    let t = swap(major, 'LALS 158', 'HIS 140B')
    t = swap(t, 'LALS 143', 'POLI 140C')
    t = swap(t, 'LALS 135', 'SOCY 156')
    expect(find(run(harness, { terms: t }), 'ud-electives').status).toBe('unmet')
  })

  it('independent study needs advisor approval (cannot-check)', () => {
    expect(find(run(harness, { terms: swap(major, 'LALS 158', 'LALS 199') }), 'ud-electives').status).toBe('cannot-check')
  })
})

// Intensive: intro + two LD electives + core + seven UD electives (two in a second language) + seminar.
const intensive = plan(
  ['2268', 'LALS 5', 'LALS 30', 'LALS 45'],
  ['2278', 'LALS 100', 'LALS 100A', 'LALS 100L'],
  ['2280', 'LALS 113', 'LALS 122', 'LALS 135'],
  ['2282', 'LIT 189A', 'LALS 143'],
  ['2288', 'LALS 158', 'LALS 170', 'LALS 194B', 'LALS 194L'],
)
const I = { concentration: 'Language Intensive Concentration' }

describe('latin-american-and-latino-studies-ba 2026-27 language intensive', () => {
  it('complete intensive record', () => {
    expect(failing(run(harness, { terms: intensive, choices: I }))).toEqual([])
  })

  it('the plain-major record is not enough for the concentration', () => {
    const r = run(harness, { terms: major, choices: I, attested: [] })
    expect(find(r, 'ld-electives').status).toBe('needs-attestation')
    expect(find(r, 'ud-electives').status).toBe('unmet')
  })

  it('needs two lower-division electives', () => {
    expect(find(run(harness, { terms: swap(intensive, 'LALS 45'), choices: I, attested: [] }), 'ld-electives').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: swap(swap(intensive, 'LALS 45'), 'LALS 30'), choices: I, attested: [] }), 'ld-electives').status).toBe('unmet')
  })

  it('needs two electives taught in a second language', () => {
    const r = run(harness, { terms: swap(intensive, 'LIT 189A', 'LALS 168'), choices: I })
    expect(find(r, 'ud-electives').status).toBe('met')
    expect(find(r, 'second-language').status).toBe('unmet')
  })

  it('LALS 157 (Spanish-taught per the LALS/EDJ page) makes the language rule cannot-check', () => {
    const r = run(harness, { terms: swap(intensive, 'LIT 189A', 'LALS 157'), choices: I })
    expect(find(r, 'second-language').status).toBe('cannot-check')
  })

  it('at most two non-LALS Spanish-list courses count as electives', () => {
    let t = swap(intensive, 'LALS 143', 'LIT 189B')
    t = swap(t, 'LALS 158', 'SPAN 156A')
    const r = run(harness, { terms: t, choices: I })
    expect(find(r, 'ud-electives').status).toBe('unmet')
    expect(find(r, 'second-language').status).toBe('met')
  })

  it('needs the senior seminar and lab', () => {
    const r = run(harness, { terms: swap(intensive, 'LALS 194B'), choices: I })
    expect(find(r, 'seminar').status).toBe('unmet')
  })
})

describe('latin-american-and-latino-studies-ba 2026-27 adversarial', () => {
  it('all three intro courses: one intro, one lower-division elective', () => {
    expect(failing(run(harness, { terms: swap(major, 'LALS 30', 'LALS 5', 'LALS 10') }))).toEqual([])
  })

  it('LIT 189C recorded under its SPAN 105 cross-listing counts as Spanish-taught', () => {
    const r = run(harness, { terms: swap(intensive, 'LIT 189A', 'SPAN 105'), choices: I })
    expect(failing(r)).toEqual([])
  })

  it('a LALS 100-level core course is not an elective (electives start at 101)', () => {
    expect(find(run(harness, { terms: [...swap(major, 'LALS 158'), ...plan(['2290', 'LALS 100'])] }), 'ud-electives').status).toBe('unmet')
  })

  it('an outside course under the C rule (C-) is not a possible substitute', () => {
    const r = run(harness, { terms: swap(major, 'LALS 158', 'HIS 140B'), grades: { 'HIS 140B': 'C-' } })
    expect(find(r, 'ud-electives').status).toBe('unmet')
  })
})

describe('latin-american-and-latino-studies-ba 2026-27 review (wave 2)', () => {
  // "May also be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam."
  it('AP Spanish 4+ is an attestation offered only when the lower-division elective is missing', () => {
    const noLd = swap(major, 'LALS 30')
    const asked = find(run(harness, { terms: noLd, attested: [] }), 'ld-elective')
    expect(asked.status).toBe('needs-attestation')
    expect(asked.attest?.id).toBe('ap-spanish')
    expect(failing(run(harness, { terms: noLd, attested: ['AP Spanish'] }))).toEqual([])
    // With the course present, nothing is asked.
    expect(failing(run(harness, { terms: major, attested: [] }))).toEqual([])
  })

  // "One elective may be satisfied with a score of 4+ on the AP Spanish Literature and Culture exam."
  it('concentration: AP Spanish covers only one of the two lower-division electives', () => {
    const one = swap(intensive, 'LALS 45')
    expect(failing(run(harness, { terms: one, choices: I, attested: ['ap spanish'] }))).toEqual([])
    const none = swap(one, 'LALS 30')
    expect(find(run(harness, { terms: none, choices: I, attested: ['ap spanish'] }), 'ld-electives').status).toBe('unmet')
  })

  it('PHIL 80E (cross-listed LALS 80E) is a LALS course: it does not use up the two-outside-course limit', () => {
    let t = swap(major, 'LALS 30', 'PHIL 80E')
    t = swap(t, 'LALS 158', 'HIS 140B')
    t = swap(t, 'LALS 143', 'POLI 140C')
    const r = run(harness, { terms: t })
    expect(find(r, 'ld-elective').status).toBe('met')
    expect(find(r, 'ud-electives').status).toBe('cannot-check')
  })

  it('LIT 189C and its SPAN 105 cross-listing are one Spanish-list course', () => {
    const r = run(harness, { terms: [...swap(intensive, 'LALS 135', 'LIT 189C'), ...plan(['2290', 'SPAN 105'])], choices: I })
    expect(find(r, 'second-language').status).toBe('met')
    expect(find(r, 'ud-electives').status).toBe('met')
  })

  it('the same senior seminar twice counts once (seminar, not also an elective)', () => {
    expect(find(run(harness, { terms: [...swap(major, 'LALS 158'), ...plan(['2290', 'LALS 194A'])] }), 'ud-electives').status).toBe('unmet')
  })

  it('a lab without its lecture: LALS 100L alone fails core and DC', () => {
    const r = run(harness, { terms: swap(major, 'LALS 100A') })
    expect(find(r, 'core').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('no-term (transfer/AP) credit counts as a completed course', () => {
    const r = run(harness, { terms: swap(major, 'LALS 1'), completed: ['LALS 1'] })
    expect(failing(r)).toEqual([])
  })

  it('a C- intro course does not count; the other intro may replace it', () => {
    expect(find(run(harness, { terms: major, grades: { 'LALS 1': 'C-' } }), 'intro').status).toBe('unmet')
    expect(failing(run(harness, { terms: swap(major, 'LALS 30', 'LALS 10'), grades: { 'LALS 1': 'C-' }, attested: [] }))).not.toContain('intro:unmet')
  })

  it('concentration: three non-LALS Spanish courses — only two count as electives', () => {
    let t = swap(intensive, 'LALS 143', 'LIT 189B')
    t = swap(t, 'LALS 158', 'SPAN 156A', 'LALS 158')
    const r = run(harness, { terms: t, choices: I })
    expect(find(r, 'ud-electives').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('concentration: outside limit already used by Spanish-list courses leaves no room for another outside course', () => {
    let t = swap(intensive, 'LALS 143', 'LIT 189B')
    t = swap(t, 'LALS 158', 'HIS 140B')
    expect(find(run(harness, { terms: t, choices: I }), 'ud-electives').status).toBe('unmet')
  })

  it('empty plan: everything unmet, nothing met', () => {
    const r = run(harness, { terms: [], attested: [] })
    expect(find(r, 'intro').status).toBe('unmet')
    expect(find(r, 'ud-electives').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('kitchen sink: every listed course plus extras is complete in both shapes', () => {
    const sink = [...intensive, ...plan(['2290', 'LALS 1', 'LALS 10', 'LALS 147', 'LIT 189Z', 'SPAN 156M', 'SPHS 115', 'LALS 199', 'HIS 140B'])]
    expect(failing(run(harness, { terms: sink }))).toEqual([])
    expect(failing(run(harness, { terms: sink, choices: I }))).toEqual([])
  })
})
