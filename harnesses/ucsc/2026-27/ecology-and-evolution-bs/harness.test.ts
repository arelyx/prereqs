import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2026 (CHEM 3B/3C include lab).
const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 16A'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'MATH 16B'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'STAT 7', 'STAT 7L'],
  ['2278', 'PHYS 6A', 'PHYS 6L', 'BIOE 106'],
  ['2280', 'PHYS 6B', 'BIOE 107'],
  ['2282', 'BIOE 109', 'BIOE 136'],
  ['2288', 'BIOE 112', 'BIOE 112L', 'BIOE 108'],
  ['2290', 'BIOE 140', 'BIOE 145', 'BIOE 145L'],
  ['2292', 'BIOE 147', 'BIOE 149'],
)
// base: topical = 108, 140, 145L or 145; general = 147, 149 + one of 145/145L
type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, term: string, ...cs: string[]) => [...t, { term, courses: cs }]

describe('ecology-and-evolution-bs 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    expect(find(r, 'lab-field').status).toBe('met')
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('a required concurrent 2-credit lab must be passed with its lecture (organism)', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 112L', null) })
    expect(find(r, 'organism').status).toBe('unmet')
  })

  it('BIOE 129 needs BIOE 129L for the organism slot but not as a topical elective', () => {
    const t = edit(edit(base, 'BIOE 112', 'BIOE 129'), 'BIOE 112L', 'METX 100')
    // METX 100 takes organism; BIOE 129 alone is a topical elective
    const r = run(harness, { terms: edit(t, 'BIOE 140', null) })
    expect(find(r, 'organism').status).toBe('met')
    expect(find(r, 'topical').status).toBe('met')
    expect(find(r, 'general').status).toBe('met')
    // only BIOE 129 (no lab) for organism, METX 100 gone
    const r2 = run(harness, { terms: edit(edit(base, 'BIOE 112', 'BIOE 129'), 'BIOE 112L', null) })
    expect(find(r2, 'organism').status).toBe('unmet')
    const r3 = run(harness, { terms: edit(edit(base, 'BIOE 112', 'BIOE 129'), 'BIOE 112L', 'BIOE 129L') })
    expect(find(r3, 'organism').status).toBe('met')
  })

  it('BIOE 131 counts for physiology without its optional lab', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 136', 'BIOE 131') })
    expect(find(r, 'physiology').status).toBe('met')
  })

  it('letter grades are required', () => {
    const r = run(harness, { terms: base, grades: { 'BIOE 107': 'P' } })
    expect(find(r, 'core-ecol-evol').status).toBe('unmet')
  })

  it('math must be one complete series; physics needs PHYS 6L', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 16B', 'MATH 11B') }), 'math').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'MATH 16B', 'MATH 19B') }), 'math').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 6L', null) }), 'physics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 6B', 'PHYS 6C') }), 'physics').status).toBe('met')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL; CHEM 4 series needs both labs', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(early, '2262', 'CHEM 3BL', 'CHEM 3CL') }), 'gen-chem').status).toBe('met')
    const four = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: four }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(four, '2272', 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('a course fills only one requirement group (eleven courses)', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 149', null) })
    expect(find(r, 'general').status).toBe('unmet')
  })

  it('a 2-credit lab cannot be a general elective by itself', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 149', 'BIOE 131L') })
    expect(find(r, 'general').status).toBe('unmet')
  })

  it('general elective: one 5-credit undergraduate research unit, at most one', () => {
    const t = edit(base, 'BIOE 149', null)
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 183W', 'BIOE 183L') }), 'general').status).toBe('met')
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 183W') }), 'general').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2298', 'ENVS 183') }), 'general').status).toBe('met')
    // two research units cannot both be general electives
    const t2 = edit(t, 'BIOE 147', null)
    expect(find(run(harness, { terms: add(t2, '2298', 'BIOE 195', 'ENVS 183') }), 'general').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t2, '2298', 'BIOE 195', 'ENVS 120') }), 'general').status).toBe('met')
  })

  it('DC needs two listed courses; BIOE 129 needs BIOE 129L for DC', () => {
    // BIOE 145 and the 5-credit BIOE 145L are two DC courses; drop 145 and 108
    const t = edit(edit(base, 'BIOE 108', 'BIOE 118'), 'BIOE 145', 'BIOE 146')
    expect(find(run(harness, { terms: t }), 'general').status).toBe('met')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 129') }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 129', 'BIOE 129L') }), 'dc').status).toBe('met')
  })

  it('NRS/BIOL 188 (spring 2023+) as half the DC is cannot-check (catalog BIOL 188 is a different course)', () => {
    const t = add(edit(edit(base, 'BIOE 108', 'BIOE 118'), 'BIOE 145', 'BIOE 146'), '2298', 'BIOL 188')
    expect(find(run(harness, { terms: t }), 'dc').status).toBe('cannot-check')
  })

  it('two of the eleven must include lab or fieldwork', () => {
    // organism METX 100 (no lab), BIOE 145L replaced by BIOE 125 (DC list, no lab): no lab/field course
    const t = edit(edit(edit(base, 'BIOE 112', 'METX 100'), 'BIOE 112L', null), 'BIOE 145L', 'BIOE 125')
    const r = run(harness, { terms: t })
    expect(find(r, 'lab-field').status).not.toBe('met')
    expect(r.status).not.toBe('met')
    // one lecture+lab combination plus one field course
    const t2 = edit(edit(base, 'BIOE 145L', 'BIOE 150L'), 'BIOE 145', 'BIOE 150')
    expect(find(run(harness, { terms: t2 }), 'lab-field').status).toBe('met')
  })

  it('a lecture and its 2-credit lab count once toward the lab/field requirement', () => {
    // labs: only BIOE 112 + BIOE 112L
    const t = edit(edit(base, 'BIOE 145L', 'BIOE 125'), 'BIOE 145', 'BIOE 147')
    const r = run(harness, { terms: edit(t, 'BIOE 147', 'BIOE 146') })
    expect(find(r, 'lab-field').status).not.toBe('met')
  })

  it('comprehensive: lab/field course, independent research or senior thesis', () => {
    const t = edit(edit(edit(base, 'BIOE 112', 'METX 100'), 'BIOE 112L', null), 'BIOE 145L', 'BIOE 125')
    expect(find(run(harness, { terms: t }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 195') }), 'comprehensive').status).toBe('met')
    expect(find(run(harness, { terms: add(t, '2298', 'CRSN 152') }), 'comprehensive').status).toBe('met')
  })

  it('BIOE 117 alone counts for DC (its lab is not part of DC) but not as an elective', () => {
    const t = edit(edit(base, 'BIOE 108', 'BIOE 117'), 'BIOE 145', 'BIOE 146')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'electives').status).toBe('unmet') // only five usable electives
    expect(find(run(harness, { terms: add(t, '2288', 'BIOE 117L') }), 'electives').status).toBe('met')
  })

  it('a lecture with a required lab cannot be a general elective without it', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'BIOE 124') }), 'general').status).toBe('unmet')
    expect(find(run(harness, { terms: add(edit(base, 'BIOE 149', 'BIOE 124'), '2298', 'BIOE 124L') }), 'general').status).toBe('met')
  })
})
