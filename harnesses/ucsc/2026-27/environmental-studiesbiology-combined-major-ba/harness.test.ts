import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 3', 'ENVS 25'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'STAT 7', 'STAT 7L'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'PHYS 1A', 'SOCY 1'],
  ['2278', 'ENVS 100', 'ENVS 100L', 'BIOE 109'],
  ['2280', 'BIOL 105', 'ENVS 147', 'ENVS 120'],
  ['2282', 'ENVS 160', 'BIOE 112', 'BIOE 112L'],
  ['2288', 'BIOE 108', 'BIOE 172'],
  ['2290', 'ENVS 190'],
)
type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, ...to: string[]) => t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))

describe('environmental-studiesbiology-combined-major-ba 2026-27', () => {
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

  it('genetics: BIOE 106 instead of BIOL 105', () => {
    expect(failing(run(harness, { terms: edit(base, 'BIOL 105', 'BIOE 106') }))).toEqual([])
  })

  it('physics: PHYS 6A needs PHYS 6L; PHYS 1B alone is fine', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 6A') }), 'physics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 6A', 'PHYS 6L') }), 'physics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 1A', 'PHYS 1B') }), 'physics').status).toBe('met')
  })

  it('chemistry: full CHEM 3A-3C series (CHEM 3C missing fails)', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3C') }), 'gen-chem').status).toBe('unmet')
  })

  it('chemistry: before fall 2026, CHEM 3B/3C need CHEM 3BL/3CL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    early[1].courses.push('CHEM 3BL')
    early[2].courses.push('CHEM 3CL')
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('met')
  })

  it('DC needs a course beyond ENVS 100/100L', () => {
    const t = edit(edit(base, 'BIOE 108', 'BIOL 140'), 'BIOE 172', 'BIOE 145')
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
})
