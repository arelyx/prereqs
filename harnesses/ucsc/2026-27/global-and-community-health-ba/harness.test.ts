import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2298', courses: cs }]

const base = plan(
  ['2268', 'GCH 1', 'BIOL 80J', 'SPAN 3'],
  ['2270', 'SOCY 1', 'STAT 5'],
  ['2278', 'CMMU 165', 'GCH 186'],
  ['2280', 'METX 115', 'CMMU 160'],
  ['2282', 'ECON 156', 'AM 115'],
  ['2288', 'SOCY 121', 'POLI 189', 'GCH 190'],
  ['2290', 'GCH 195'],
)

describe('global-and-community-health-ba 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('C or better, letter grade', () => {
    expect(find(run(harness, { terms: base, grades: { 'GCH 1': 'C-' } }), 'gch1').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'GCH 1': 'P' } }), 'gch1').status).toBe('unmet')
    expect(find(run(harness, { terms: base, grades: { 'GCH 1': 'C' } }), 'gch1').status).toBe('met')
  })

  it('each lower-division list needs its own course', () => {
    // SOCY 1 is only on list B: replacing BIOL 80J with a second list-B course leaves A unmet
    const r = run(harness, { terms: edit(base, 'BIOL 80J', 'PSYC 1') })
    expect(find(r, 'ld-a').status).toBe('unmet')
  })

  it('STAT 7 counts for quantitative competency without STAT 7L', () => {
    const r = run(harness, { terms: edit(base, 'STAT 5', 'STAT 7') })
    expect(find(r, 'ld-c').status).toBe('met')
  })

  it('language: listed course or test-out attestation', () => {
    const t = edit(base, 'SPAN 3', null)
    expect(find(run(harness, { terms: t, attested: [] }), 'ld-d').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t }), 'ld-d').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'SPAN 3', 'SPHS 6'), attested: [] }), 'ld-d').status).toBe('met')
  })

  it('a common-core course cannot also count as an area elective', () => {
    // GCH 186 is Req 2 and also Area III; drop ECON 156 so Area III depends on it
    const r = run(harness, { terms: edit(base, 'ECON 156', null) })
    expect(r.status).toBe('unmet')
    const st = ['core-2', 'area-3', 'area-additional'].map((id) => find(r, id).status)
    expect(st).toContain('unmet')
  })

  it('one course per area plus two more: six distinct electives', () => {
    const r = run(harness, { terms: edit(base, 'POLI 189', null) })
    expect(find(r, 'area-additional').status).toBe('unmet')
  })

  it('a course listed in two areas counts once', () => {
    // ENVS 130B is in Area I and Area III; replace METX 115 (I) and ECON 156 (III) with it
    const t = edit(edit(base, 'METX 115', 'ENVS 130B'), 'ECON 156', null)
    const r = run(harness, { terms: t })
    expect(r.status).toBe('unmet')
  })

  it('missing an area fails even with enough electives', () => {
    // drop the Area IV course, add a sixth Area II course
    const r = run(harness, { terms: add(edit(base, 'AM 115', null), 'SOCY 147') })
    expect(find(r, 'area-4').status).toBe('unmet')
  })

  it('ENVS 104L with 104A counts as one Area IV course', () => {
    const t = edit(base, 'AM 115', 'ENVS 104L')
    expect(failing(run(harness, { terms: add(t, 'ENVS 104A') }))).toEqual([])
  })

  it('one independent study by petition', () => {
    const t = add(edit(base, 'POLI 189', null), 'SOCY 198')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: [] }), 'area-additional').status).toBe('needs-attestation')
    const two = add(edit(edit(base, 'POLI 189', null), 'SOCY 121', null), 'SOCY 198', 'ANTH 198')
    expect(find(run(harness, { terms: two }), 'area-additional').status).toBe('unmet')
  })

  it('DC options; comprehensive follows DC', () => {
    const thesis = edit(base, 'GCH 190', 'GCH 199A')
    expect(failing(run(harness, { terms: thesis }))).toEqual([])
    const r = run(harness, { terms: edit(base, 'GCH 190', null) })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('CHEM 4A with its lab counts once for list A; STAT 7L alone does not count', () => {
    expect(failing(run(harness, { terms: add(edit(base, 'BIOL 80J', 'CHEM 4A'), 'CHEM 4AL') }))).toEqual([])
    expect(find(run(harness, { terms: edit(base, 'STAT 5', 'STAT 7L') }), 'ld-c').status).toBe('unmet')
  })

  // review 2026-10-06: "For courses with a required concurrently enrolled lab, only successful
  // completion of the lecture is required for the major." ENVS 104A is the lecture, 104L its lab.
  it('ENVS 104A (the lecture) alone counts for Area IV; ENVS 104L absorbs into it', () => {
    expect(failing(run(harness, { terms: edit(base, 'AM 115', 'ENVS 104A') }))).toEqual([])
    const both = add(edit(base, 'AM 115', 'ENVS 104A'), 'ENVS 104L')
    // the pair is one course: it cannot also fill an "additional" elective
    expect(find(run(harness, { terms: edit(both, 'POLI 189', null) }), 'area-additional').status).toBe('unmet')
  })

  it('language test-out is offered only when no listed language course is in the plan', () => {
    expect(() => find(run(harness, { terms: base, attested: [] }), 'attest:language-test-out')).toThrow()
    expect(find(run(harness, { terms: edit(base, 'SPAN 3', null), attested: [] }), 'attest:language-test-out').status).toBe('needs-attestation')
  })

  it('cross-listed codes count (GCH 165 for CMMU 165, GCH 20 for list B); ENVS/LGST 130B counts once', () => {
    expect(failing(run(harness, { terms: edit(edit(base, 'CMMU 165', 'GCH 165'), 'SOCY 1', 'GCH 20') }))).toEqual([])
    const t = edit(edit(base, 'METX 115', 'LGST 130B'), 'ECON 156', 'ENVS 130B')
    expect(find(run(harness, { terms: t }), 'areas').status).toBe('unmet')
  })
})
