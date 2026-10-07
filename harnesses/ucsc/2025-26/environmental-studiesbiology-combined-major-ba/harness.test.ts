import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 3', 'ENVS 25'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'CHEM 3BL', 'STAT 7', 'STAT 7L'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'CHEM 3CL', 'PHYS 1A', 'SOCY 1'],
  ['2278', 'ENVS 100', 'ENVS 100L', 'BIOE 109'],
  ['2280', 'BIOL 105', 'ENVS 147', 'ENVS 120'],
  ['2282', 'ENVS 160', 'BIOE 112', 'BIOE 112L'],
  ['2288', 'BIOE 108', 'BIOE 172'],
  ['2290', 'ENVS 190'],
)
type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, ...to: string[]) => t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('environmental-studiesbiology-combined-major-ba 2025-26', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    // BIOE 108 counts as a biology elective and as the DC course
    expect(find(r, 'dc').status).toBe('met')
  })

  it('every requirement needs a letter grade', () => {
    const r = run(harness, { terms: base, grades: { 'ENVS 160': 'P' } })
    expect(find(r, 'envs-electives').status).toBe('unmet')
  })

  it('ENVS electives need a social-science course', () => {
    const t = edit(base, 'ENVS 147', 'ENVS 122')
    expect(find(run(harness, { terms: t }), 'envs-electives').status).toBe('unmet')
  })

  it('lab-based elective: the lab must be taken', () => {
    const t = edit(base, 'BIOE 112L')
    expect(find(run(harness, { terms: t }), 'lab-elective').status).toBe('unmet')
    // a stand-alone field lab works
    expect(failing(run(harness, { terms: edit(edit(base, 'BIOE 112L'), 'BIOE 112', 'BIOE 141L') }))).toEqual([])
  })

  it('BIOE 129 (lab optional per catalog) counts for the lab-based elective only with 129L', () => {
    const t = edit(edit(base, 'BIOE 112L'), 'BIOE 112', 'BIOE 129')
    expect(find(run(harness, { terms: t }), 'lab-elective').status).toBe('unmet')
  })

  it('a single course may not satisfy more than one requirement (BIOE 109 is not also a bio elective)', () => {
    const t = edit(base, 'BIOE 172')
    expect(find(run(harness, { terms: t }), 'bio-electives').status).toBe('unmet')
  })

  it('bio electives: a lecture whose catalog requires its lab needs it (BIOE 133 without 133L)', () => {
    const t = edit(base, 'BIOE 172', 'BIOE 133')
    expect(find(run(harness, { terms: t }), 'bio-electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 172', 'BIOE 133', 'BIOE 133L') }), 'bio-electives').status).toBe('met')
  })

  it('bio electives: BIOL 100-140 also count; BIOE 193 (independent research) is outside BIOE 107-188', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 172', 'BIOL 140') }), 'bio-electives').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOE 172', 'BIOE 193') }), 'bio-electives').status).toBe('unmet')
  })

  it('2025-26: BIOL 105 is required (BIOE 106 is not an alternative)', () => {
    expect(failing(run(harness, { terms: edit(base, 'BIOL 105', 'BIOE 106') }))).toEqual(['ud-core/BIOL105:unmet'])
  })

  it('2025-26: PHIL 28 / BME 80G satisfy the social course', () => {
    expect(failing(run(harness, { terms: edit(base, 'SOCY 1', 'PHIL 28') }))).toEqual([])
    expect(failing(run(harness, { terms: edit(base, 'SOCY 1', 'BME 80G') }))).toEqual([])
  })

  it('2025-26: BIOE 145 + 145L is a lab-based elective (lab required) and a DC course', () => {
    const t = edit(edit(base, 'BIOE 112L'), 'BIOE 112', 'BIOE 145', 'BIOE 145L')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: edit(t, 'BIOE 145L') }), 'lab-elective').status).toBe('unmet')
    const dc = edit(edit(edit(base, 'BIOE 108', 'BIOE 145', 'BIOE 145L'), 'ENVS 190', 'ENVS 196'), 'BIOE 172', 'BIOE 140')
    expect(find(run(harness, { terms: dc }), 'dc-course').status).toBe('met')
  })

  it('2025-26: ENVS 196G is not a DC or comprehensive option', () => {
    const r = run(harness, { terms: edit(edit(edit(base, 'BIOE 108', 'BIOE 140'), 'BIOE 172', 'BIOE 107'), 'ENVS 190', 'ENVS 196G') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('physics: PHYS 6A needs PHYS 6L; PHYS 1B alone is fine', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 6A') }), 'physics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 6A', 'PHYS 6L') }), 'physics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 1B') }), 'physics').status).toBe('met')
  })

  it('chemistry: full CHEM 3A-3C series (CHEM 3C missing fails)', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3C') }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: CHEM 3BL/3CL always required (before fall 2026: unmet; from fall 2026: cannot-check)', () => {
    const noLabs = edit(edit(base, 'CHEM 3BL'), 'CHEM 3CL')
    const early = noLabs.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: noLabs }), 'gen-chem').status).toBe('cannot-check')
  })

  it('2025-26: CHEM 1A, 1B, 1C and 1N (note) satisfy chemistry', () => {
    const old = [{ term: '2228', courses: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'] }, ...base.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('CHEM')) }))]
    expect(find(run(harness, { terms: old }), 'gen-chem').status).toBe('met')
  })

  it('DC needs a course beyond ENVS 100/100L', () => {
    const t = edit(edit(base, 'BIOE 108', 'BIOL 140'), 'BIOE 172', 'BIOE 140')
    // ENVS 190 still satisfies the DC; drop it too
    const r = run(harness, { terms: edit(t, 'ENVS 190') })
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('comprehensive: BIOE 151B cannot be both the lab-based elective and the comprehensive', () => {
    const t = edit(edit(edit(base, 'BIOE 112L'), 'BIOE 112', 'BIOE 151B'), 'ENVS 190')
    const r = run(harness, { terms: t })
    expect(r.status).not.toBe('met')
    expect(failing(r).length).toBe(1)
  })

  it('math: AM 6 counts; or AP/ALEKS attestation', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 3', 'AM 6') }), 'math').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'MATH 3'), attested: [] }), 'math').status).toBe('needs-attestation')
  })

  it('ENVS internship (ENVS 183) is not an ENVS elective', () => {
    expect(find(run(harness, { terms: edit(base, 'ENVS 160', 'ENVS 183') }), 'envs-electives').status).toBe('unmet')
  })
  it('review: cross-listed LGST 140E counts as the social-science ENVS 140 with no alias map', () => {
    expect(failing(run(harness, { terms: edit(base, 'ENVS 147', 'LGST 140E') }))).toEqual([])
  })
  it('review (§1a): ALEKS placement only when no math course is in the plan; failed course stays unmet', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 3') }), 'math').status).toBe('met')
    expect(find(run(harness, { terms: base, grades: { 'MATH 3': 'F' }, attested: [] }), 'math').status).toBe('unmet')
  })
  it('review: a graduate seminar by instructor invitation can be the comprehensive', () => {
    // "Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor."
    const t = edit(base, 'ENVS 190', 'ENVS 290')
    expect(failing(run(harness, { terms: t, attested: [] }))).toEqual(['comprehensive:needs-attestation'])
    expect(failing(run(harness, { terms: t, attested: ['graduate seminar'] }))).toEqual([])
  })
  it('review: one course cannot be both the lab-based elective and a BIOE elective', () => {
    expect(failing(run(harness, { terms: edit(base, 'BIOE 172') }))).toEqual(['bio-electives:unmet'])
  })
})
