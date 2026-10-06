import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// General major, frosh from fall 2026.
const base = plan(
  ['2268', 'ENVS 23', 'ENVS 24', 'MATH 3'],
  ['2270', 'ENVS 25', 'STAT 7', 'STAT 7L'],
  ['2272', 'ENVS 26'],
  ['2278', 'ENVS 100', 'ENVS 100L'],
  ['2280', 'ENVS 120', 'ENVS 140', 'ENVS 147'],
  ['2282', 'ENVS 160', 'ENVS 167', 'ENVS 167L'],
  ['2288', 'ENVS 158', 'ENVS 195A'],
  ['2290', 'ENVS 195B'],
)
type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, ...to: string[]) => t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? to : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2292', courses: cs }]

describe('environmental-studies-ba 2026-27', () => {
  it('complete general-major record (no concentration declared = general)', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'electives').status).toBe('met')
  })

  it('ENVS 195A counts as an elective and as half of the comprehensive', () => {
    const r = run(harness, { terms: base })
    expect(find(r, 'electives').used?.map((e) => e.display)).toContain('ENVS 195A')
    expect(find(r, 'comprehensive').status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
  })

  it('electives need at least one natural-science course', () => {
    // swap all natural-science electives for social ones
    let t = edit(base, 'ENVS 120', 'ENVS 141')
    t = edit(t, 'ENVS 160', 'ENVS 145')
    t = edit(t, 'ENVS 167', 'ENVS 172')
    t = edit(t, 'ENVS 167L')
    const n = find(run(harness, { terms: t }), 'electives')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/natural/)
  })

  it('electives need at least one social-science course', () => {
    let t = edit(base, 'ENVS 140', 'ENVS 122')
    t = edit(t, 'ENVS 147', 'ENVS 123')
    t = edit(t, 'ENVS 158', 'ENVS 131')
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
    // ENVS 156 is in ENVS 101-179 but on neither list: still fine once one social course is there
    const ok = edit(t, 'ENVS 131', 'ENVS 141')
    expect(find(run(harness, { terms: ok }), 'electives').status).toBe('met')
  })

  it('cannot count both ENVS 183A and ENVS 195A', () => {
    const t = edit(base, 'ENVS 158', 'ENVS 183A')
    // remaining electives: 120,140,147,160,167(+L),183A,195A → only one of 183A/195A counts
    expect(find(run(harness, { terms: t }), 'electives').status).toBe('unmet')
  })

  it('ENVS 167 + 167L count as one elective; a 2-credit lab alone does not count', () => {
    const t = edit(base, 'ENVS 167', 'ENVS 162L')
    expect(find(run(harness, { terms: edit(t, 'ENVS 167L') }), 'electives').status).toBe('unmet')
  })

  it('ENVS 104A counts only with its required lab ENVS 104L', () => {
    const t = edit(base, 'ENVS 167', 'ENVS 104A')
    const t2 = edit(t, 'ENVS 167L')
    expect(find(run(harness, { terms: t2 }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(t, 'ENVS 167L', 'ENVS 104L') }), 'electives').status).toBe('met')
  })

  it('cross-listed LGST 140E counts as ENVS 140 (social science)', () => {
    expect(failing(run(harness, { terms: edit(base, 'ENVS 140', 'LGST 140E') }))).toEqual([])
  })

  it('CHEM 3A + 3B replaces ENVS 23; 3B before fall 2026 needs 3BL', () => {
    const t = edit(base, 'ENVS 23', 'CHEM 3A', 'CHEM 3B')
    expect(find(run(harness, { terms: t }), 'chem').status).toBe('met')
    const early = [{ term: '2258', courses: ['CHEM 3A', 'CHEM 3B'] }, ...edit(base, 'ENVS 23')]
    expect(find(run(harness, { terms: early }), 'chem').status).toBe('unmet')
    early[0].courses.push('CHEM 3BL')
    expect(find(run(harness, { terms: early }), 'chem').status).toBe('met')
  })

  it('review (§1a): ALEKS placement is offered only when no math course is in the plan; a failed course stays unmet', () => {
    const t = edit(base, 'MATH 3')
    expect(find(run(harness, { terms: t }), 'math').detail).toMatch(/placement/)
    const failed = run(harness, { terms: base, grades: { 'MATH 3': 'F' }, attested: [] })
    expect(find(failed, 'math').status).toBe('unmet')
  })

  it('review: a graduate seminar by instructor invitation is a general-major comprehensive option', () => {
    // "Students with advanced skills in one of the graduate focal areas may also take a graduate seminar by invitation from the instructor."
    const t = edit(edit(base, 'ENVS 195B'), 'ENVS 195A', 'ENVS 156', 'ENVS 290')
    expect(find(run(harness, { terms: t, attested: [] }), 'comprehensive').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['graduate seminar'] }), 'comprehensive').status).toBe('met')
    // letter grade still required
    expect(find(run(harness, { terms: t, grades: { 'ENVS 290': 'P' } }), 'comprehensive').status).toBe('unmet')
    // not offered in a concentration
    expect(find(run(harness, { terms: t, choices: { concentration: 'gis' } }), 'comprehensive').status).toBe('unmet')
  })

  it('review: cross-listed POLI 179 counts as ENVS 144 (social science) with no alias map', () => {
    expect(failing(run(harness, { terms: edit(base, 'ENVS 140', 'POLI 179') }))).toEqual([])
  })

  it('math: course, or AP/ALEKS attestation', () => {
    const t = edit(base, 'MATH 3')
    expect(find(run(harness, { terms: t, attested: [] }), 'math').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['ALEKS'] }), 'math').status).toBe('met')
  })

  it('statistics series must be complete (STAT 7 needs STAT 7L)', () => {
    expect(find(run(harness, { terms: edit(base, 'STAT 7L') }), 'stats').status).toBe('unmet')
  })

  it('DC needs one course beyond ENVS 100/100L', () => {
    const r = run(harness, { terms: edit(base, 'ENVS 195B') })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('comprehensive must be letter graded; P/NP is fine elsewhere', () => {
    const r = run(harness, { terms: base, grades: { 'ENVS 195B': 'P', 'ENVS 120': 'P' } })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
  })

  it('comprehensive package: ENVS 195A taken P also breaks the 195A+195B option', () => {
    const r = run(harness, { terms: base, grades: { 'ENVS 195A': 'P' } })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'electives').status).toBe('met')
  })

  it('BIOE 151B alone satisfies DC and comprehensive for the general major', () => {
    const r = run(harness, { terms: edit(edit(base, 'ENVS 195B', 'BIOE 151B'), 'ENVS 195A', 'ENVS 141') })
    expect(failing(r)).toEqual([])
  })

  it('comprehensive: 195A alone is not a complete option; ENVS 190 alone is', () => {
    const t = edit(base, 'ENVS 195B', 'ENVS 190')
    expect(failing(run(harness, { terms: t }))).toEqual([])
  })

  it('missing ENVS 100L fails upper-division and DC', () => {
    const r = run(harness, { terms: edit(base, 'ENVS 100L') })
    expect(find(r, 'envs100').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  // --- GIS
  const gis = add(edit(base, 'ENVS 167', 'ENVS 115A'), 'ENVS 115L', 'ENVS 115B', 'ENVS 115C')
  it('GIS: complete with the 115 sequence, four electives, 195A/B', () => {
    const t = edit(edit(gis, 'ENVS 167L'), 'ENVS 115A', 'ENVS 115A')
    const r = run(harness, { terms: t, choices: { concentration: 'GIS' } })
    expect(failing(r)).toEqual([])
  })

  it('GIS: ENVS 196 is not a GIS comprehensive/DC option', () => {
    const t = edit(edit(gis, 'ENVS 167L'), 'ENVS 195B', 'ENVS 196')
    const r = run(harness, { terms: t, choices: { concentration: 'gis' } })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('GIS: missing ENVS 115C', () => {
    const t = edit(edit(gis, 'ENVS 167L'), 'ENVS 115C')
    expect(find(run(harness, { terms: t, choices: { concentration: 'gis' } }), 'gis-core').status).toBe('unmet')
  })

  // --- GEJ
  const gej = plan(
    ['2268', 'ENVS 23', 'BIOE 20C', 'MATH 19A'],
    ['2270', 'ENVS 25', 'STAT 17', 'STAT 17L', 'SOCY 1'],
    ['2278', 'ENVS 100', 'ENVS 100L'],
    ['2280', 'ENVS 147', 'ENVS 158', 'SOCY 185', 'JRLC 135'],
    ['2282', 'ENVS 120', 'ENVS 141', 'ENVS 110'],
    ['2288', 'ENVS 196'],
  )
  it('GEJ: complete record', () => {
    expect(failing(run(harness, { terms: gej, choices: { concentration: 'Global Environmental Justice' } }))).toEqual([])
  })
  it('GEJ: the three additional electives need a natural-science course', () => {
    const t = edit(gej, 'ENVS 120', 'ENVS 145')
    expect(find(run(harness, { terms: t, choices: { concentration: 'gej' } }), 'electives').status).toBe('unmet')
  })
  it('GEJ: ENVS 141 is not an environmental-justice elective', () => {
    // move SOCY 185 out: EJ has 147, 158, JRLC 135 + 141 (not on EJ list)
    const t = edit(gej, 'SOCY 185', 'ENVS 145')
    const r = run(harness, { terms: t, choices: { concentration: 'gej' } })
    expect(find(r, 'ej-electives').status).toBe('unmet')
  })

  // --- CSP
  const csp = plan(
    ['2268', 'ENVS 23', 'ENVS 24', 'AM 3'],
    ['2270', 'ENVS 25', 'STAT 7', 'STAT 7L', 'ANTH 2'],
    ['2278', 'ENVS 100', 'ENVS 100L'],
    ['2280', 'ENVS 120', 'ENVS 150', 'ENVS 141'],
    ['2282', 'ENVS 160', 'ENVS 106A', 'ENVS 106M'],
    ['2288', 'ENVS 142', 'ENVS 156'],
    ['2290', 'ENVS 190'],
  )
  it('CSP: complete record', () => {
    expect(failing(run(harness, { terms: csp, choices: { concentration: 'csp' } }))).toEqual([])
  })
  it('CSP: field course needs its lab (ENVS 106A without 106M)', () => {
    const r = run(harness, { terms: edit(csp, 'ENVS 106M'), choices: { concentration: 'csp' } })
    // 106A could move to CSP electives but then the field course is missing
    expect(r.status).not.toBe('met')
    expect(find(r, 'csp-field').status).toBe('unmet')
  })
  it('CSP: the CEC field course (XENV 188) satisfies the field course', () => {
    const t = edit(edit(csp, 'ENVS 106M'), 'ENVS 106A', 'XENV 188')
    const t2 = edit(t, 'ENVS 156', 'ENVS 156', 'ENVS 110')
    expect(failing(run(harness, { terms: t2, choices: { concentration: 'csp' } }))).toEqual([])
  })
  it('CSP: no duplicates — ENVS 120 cannot fill both the conservation slot and a CSP elective', () => {
    const t = edit(csp, 'ENVS 141', 'ENVS 156')
    // CSP electives now 160 + (120 used) → short
    const r = run(harness, { terms: edit(t, 'ENVS 160', 'ENVS 171'), choices: { concentration: 'csp' } })
    expect(find(r, 'csp-electives').status).toBe('unmet')
  })
  it('CSP: BIOE 151A-D supercourse courses are not CSP general electives', () => {
    // XENV 188 fills the field course; BIOE 151C would then have to be a general elective
    const t = edit(edit(edit(csp, 'ENVS 156', 'BIOE 151C'), 'ENVS 106M'), 'ENVS 106A', 'XENV 188')
    expect(find(run(harness, { terms: t, choices: { concentration: 'csp' } }), 'electives').status).toBe('unmet')
  })
})
