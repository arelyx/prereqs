import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh under the 2025-26 catalog (CHEM 3BL/3CL always required).
const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 16A'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'CHEM 3BL', 'MATH 16B'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'CHEM 3CL', 'STAT 7', 'STAT 7L'],
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

describe('ecology-and-evolution-bs 2025-26', () => {
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

  it('2025-26: CHEM 3BL and 3CL are required even for CHEM 3B/3C taken fall 2026 or later; CHEM 4 series needs both labs', () => {
    expect(find(run(harness, { terms: edit(base, 'CHEM 3BL', null) }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'CHEM 3CL', null) }), 'gen-chem').status).toBe('unmet')
    const four = edit(edit(edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL'), 'CHEM 3BL', null), 'CHEM 3CL', null)
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

  // --- adversarial review 2026-10-06 ---
  const noLab = edit(edit(edit(base, 'BIOE 112', 'METX 100'), 'BIOE 112L', null), 'BIOE 145L', 'BIOE 125')

  it('review: lab/field counts extra lab courses the student has (electives prefer them)', () => {
    expect(find(run(harness, { terms: noLab }), 'lab-field').status).not.toBe('met')
    const r = run(harness, { terms: add(noLab, '2298', 'BIOE 150L', 'BIOE 155L') })
    expect(find(r, 'lab-field').status).toBe('met')
    expect(failing(r)).toEqual([])
  })

  it('review: transfer STAT 5 (transfer-preparation statistics option) is cannot-check, frosh STAT 5 unmet', () => {
    const t = edit(edit(base, 'STAT 7', 'STAT 5'), 'STAT 7L', null)
    expect(run(harness, { terms: t }).status).toBe('unmet')
    const r = run(harness, { terms: t, entry: 'transfer' })
    expect(find(r, 'stats-stat5').status).toBe('cannot-check')
    expect(r.status).toBe('cannot-check')
  })

  it('review: a mixed MATH 11/19 sequence is cannot-check (page lists only whole series)', () => {
    const t = edit(edit(base, 'MATH 16A', 'MATH 11A'), 'MATH 16B', 'MATH 19B')
    expect(find(run(harness, { terms: t }), 'math').status).toBe('cannot-check')
  })

  it('review: ENVS 115A counts without ENVS 115L (not a concurrent corequisite); ENVS 115L alone does not', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'ENVS 115A') }), 'general').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'BIOE 149', 'ENVS 115L') }), 'general').status).toBe('unmet')
  })

  it('review: comprehensive — another department\'s research course is cannot-check; P in BIOE 195 is cannot-check', () => {
    expect(find(run(harness, { terms: noLab }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: add(noLab, '2298', 'BIOL 199') }), 'comprehensive').status).toBe('cannot-check')
    expect(find(run(harness, { terms: add(noLab, '2298', 'BIOE 195'), grades: { 'BIOE 195': 'P' } }), 'comprehensive').status).toBe('cannot-check')
    expect(find(run(harness, { terms: add(noLab, '2298', 'BIOE 195') }), 'comprehensive').status).toBe('met')
  })

  it('review: catalog no-credit-for-both pair counts once (BIOE 165 / ENVS 120)', () => {
    const t = edit(edit(base, 'BIOE 149', 'BIOE 165'), 'BIOE 147', 'ENVS 120')
    expect(find(run(harness, { terms: t }), 'general').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2298', 'ENVS 108') }), 'general').status).toBe('met')
  })

  it('review: a 2-credit lab alone fills no physiology slot (BIOE 133L without BIOE 133)', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 136', 'BIOE 133L') }), 'physiology').status).toBe('unmet')
  })

  it('review: BIOE 129 alone is a topical elective; with 129L it is a DC course and a lab/field course', () => {
    const t = edit(edit(edit(base, 'BIOE 145L', 'BIOE 129'), 'BIOE 145', 'BIOE 129L'), 'BIOE 108', 'BIOE 125')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'lab-field').status).toBe('met')
    expect(find(run(harness, { terms: edit(t, 'BIOE 129L', null) }), 'dc').status).toBe('unmet')
  })

  it('2025-26: term-less transfer CHEM 3B/3C without the labs is unmet (no term-dependent rule)', () => {
    const t = edit(edit(edit(edit(base, 'CHEM 3B', null), 'CHEM 3C', null), 'CHEM 3BL', null), 'CHEM 3CL', null)
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3C'], entry: 'transfer' }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: t, completed: ['CHEM 3B', 'CHEM 3C', 'CHEM 3BL', 'CHEM 3CL'], entry: 'transfer' }), 'gen-chem').status).toBe('met')
  })

  it('2025-26: the pre-2023 series CHEM 1A, 1B, 1C and 1N satisfies general chemistry', () => {
    const t = edit(edit(edit(edit(edit(base, 'CHEM 3A', null), 'CHEM 3B', null), 'CHEM 3C', null), 'CHEM 3BL', null), 'CHEM 3CL', null)
    expect(find(run(harness, { terms: t, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1N'] }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: t, completed: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C'] }), 'gen-chem').status).toBe('unmet')
  })

  it('2025-26: BIOE 175 and BIOE 176 are not topical electives (general electives only)', () => {
    // only BIOE 145/145L remain topical-eligible; 175/176 would complete topical in 2026-27
    const t = edit(edit(edit(edit(base, 'BIOE 108', 'OCEA 122'), 'BIOE 140', 'ECON 166A'), 'BIOE 147', 'BIOE 175'), 'BIOE 149', 'BIOE 176')
    const r = run(harness, { terms: t })
    expect(find(r, 'topical').status).toBe('unmet')
    expect(find(r, 'topical').used?.map((e) => e.display)).not.toContain('BIOE 175')
    expect(find(r, 'general').status).toBe('met')
  })

  it('2025-26: BIOE 119L, 157A and 157B are not on the comprehensive list', () => {
    const noComp = edit(edit(edit(base, 'BIOE 112', 'METX 100'), 'BIOE 112L', null), 'BIOE 145L', 'BIOE 125')
    expect(find(run(harness, { terms: noComp }), 'comprehensive').status).toBe('unmet')
    for (const c of ['BIOE 119L', 'BIOE 157A', 'BIOE 157B'])
      expect(find(run(harness, { terms: add(noComp, '2298', c) }), 'comprehensive').status).toBe('unmet')
  })

  it('review: planned courses are in-progress; empty plan is unmet with qualification as info', () => {
    expect(run(harness, { terms: base, currentTerm: '2290' }).status).toBe('in-progress')
    const r = run(harness, { terms: [] })
    expect(r.status).toBe('unmet')
    expect(find(r, 'qualification').status).toBe('info')
    expect(find(r, 'lab-field').status).toBe('unmet')
  })

  it('review: kitchen-sink plan is met', () => {
    const r = run(harness, { terms: add(base, '2298', 'BIOE 117', 'BIOE 117L', 'BIOE 137', 'BIOE 137L', 'ENVS 120', 'BIOE 165', 'BIOE 193', 'BIOE 195', 'BIOL 188', 'ENVS 183', 'METX 100', 'METX 100L', 'BIOE 131', 'BIOE 131L', 'BIOE 129', 'BIOE 129L') })
    expect(failing(r)).toEqual([])
  })
})
