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
  ['2280', 'PHYS 6B', 'BIOE 109'],
  ['2282', 'BIOE 107', 'BIOE 117', 'BIOE 117L'],
  ['2288', 'BIOE 135', 'BIOE 135L', 'BIOE 118'],
  ['2290', 'BIOE 145', 'ENVS 160'],
  ['2292', 'BIOE 108', 'BIOE 122', 'BIOE 122L'],
  ['2298', 'METX 100'],
)
type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, term: string, ...cs: string[]) =>
  t.some((q) => q.term === term) ? t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q)) : [...t, { term, courses: cs }]

describe('plant-sciences-bs 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(early, '2262', 'CHEM 3BL', 'CHEM 3CL') }), 'gen-chem').status).toBe('met')
  })

  it('math must be one whole series; MATH 16A + 11B is not', () => {
    expect(find(run(harness, { terms: edit(base, 'MATH 16B', 'MATH 11B') }), 'math').status).toBe('unmet')
    // a mixed 11/19 sequence is not addressed by this page
    const mixed = edit(edit(base, 'MATH 16A', 'MATH 11A'), 'MATH 16B', 'MATH 19B')
    expect(find(run(harness, { terms: mixed }), 'math').status).toBe('cannot-check')
  })

  it('physics needs PHYS 6L; 6A + 6L + 6C also works', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 6L', null) }), 'physics').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'PHYS 6B', 'PHYS 6C') }), 'physics').status).toBe('met')
  })

  it('STAT 7L is required; STAT 5 is cannot-check only for transfers', () => {
    const t = edit(edit(base, 'STAT 7', 'STAT 5'), 'STAT 7L', null)
    expect(run(harness, { terms: t }).status).toBe('unmet')
    expect(run(harness, { terms: t, entry: 'transfer' }).status).toBe('cannot-check')
  })

  it('BIOL 105 substitutes for BIOE 106', () => {
    expect(run(harness, { terms: edit(base, 'BIOE 106', 'BIOL 105') }).status).toBe('met')
  })

  it('BIOE 135 without its required concurrent lab does not count', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 135L', null) })
    expect(find(r, 'plant-physiology').status).toBe('unmet')
    // ENVS 162 needs no lab
    expect(run(harness, { terms: edit(edit(base, 'BIOE 135L', null), 'BIOE 135', 'ENVS 162') }).status).toBe('met')
  })

  it('botany: BIOE 120 needs BIOE 120L', () => {
    const t = edit(edit(base, 'BIOE 117', 'BIOE 120'), 'BIOE 117L', null)
    expect(find(run(harness, { terms: t }), 'botany').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2282', 'BIOE 120L') }), 'botany').status).toBe('met')
  })

  it('a course fills only one group: BIOE 145 as ecology cannot also be a topical elective', () => {
    // Remove BIOE 107: BIOE 145 must be the ecology course, leaving two topical electives.
    const r = run(harness, { terms: edit(base, 'BIOE 107', null) })
    expect(r.status).toBe('unmet')
    expect(find(r, 'ecology').status).toBe('met')
  })

  it('general electives: BIOE 100-179 must be 5+ credits and not a lone 2-credit lab', () => {
    const r = run(harness, { terms: edit(base, 'METX 100', 'BIOE 129L') })
    expect(find(r, 'general').status).toBe('unmet')
    // BIOE 129 alone (optional lab) counts as a general elective
    expect(find(run(harness, { terms: edit(base, 'METX 100', 'BIOE 129') }), 'general').status).toBe('met')
  })

  it('a general elective outside the list does not count (ENVS 100)', () => {
    expect(find(run(harness, { terms: edit(base, 'METX 100', 'ENVS 100') }), 'general').status).toBe('unmet')
  })

  it('5 credits of undergraduate research may be one general elective, but only one', () => {
    const t = edit(base, 'METX 100', 'BIOE 183W')
    expect(find(run(harness, { terms: t }), 'general').status).toBe('unmet') // 2 credits
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 183L') }), 'general').status).toBe('met') // 2 + 3
    // two research units cannot both count
    const two = edit(edit(base, 'METX 100', 'BIOE 193'), 'BIOE 108', 'BIOE 195')
    expect(find(run(harness, { terms: two }), 'general').status).toBe('unmet')
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOE 109': 'P' } }), 'evolution').status).toBe('unmet')
    // a P in a research course that may be P/NP-only is not decided
    const t = edit(base, 'METX 100', 'BIOE 193')
    expect(find(run(harness, { terms: t, grades: { 'BIOE 193': 'P' } }), 'general').status).toBe('cannot-check')
  })

  // DC courses in the base record: BIOE 117 (botany), BIOE 145, BIOE 108, BIOE 122/122L.
  // Strip to BIOE 117 alone: 108 → 131, 145 → 121, 122/122L → 124/124L (not DC).
  const oneDc = edit(edit(edit(edit(base, 'BIOE 108', 'BIOE 131'), 'BIOE 145', 'BIOE 121'), 'BIOE 122', 'BIOE 124'), 'BIOE 122L', 'BIOE 124L')

  it('DC needs two from the list; BIOE 117 alone counts; BIOE 129 only with 129L', () => {
    expect(run(harness, { terms: base }).status).toBe('met')
    const r = run(harness, { terms: oneDc })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(failing(r)).toEqual(['dc:unmet'])
    expect(find(run(harness, { terms: add(oneDc, '2298', 'BIOE 129') }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(oneDc, '2298', 'BIOE 129', 'BIOE 129L') }), 'dc').status).toBe('met')
    expect(find(run(harness, { terms: add(oneDc, '2298', 'BIOE 122', 'BIOE 122L') }), 'dc').status).toBe('met')
  })

  it('DC: a paired 2-credit lab must be taken in the same term', () => {
    const split = add(add(oneDc, '2298', 'BIOE 129'), '2302', 'BIOE 129L')
    expect(find(run(harness, { terms: split }), 'dc').status).toBe('unmet')
  })

  it('NRS/BIOL 188 half-DC cannot be confirmed from the catalog', () => {
    expect(find(run(harness, { terms: add(oneDc, '2298', 'BIOL 188') }), 'dc').status).toBe('cannot-check')
    expect(find(run(harness, { terms: add(oneDc, '2228', 'BIOL 188') }), 'dc').status).toBe('unmet') // before spring 2023
  })

  it('comprehensive needs a listed field/lab course, research or thesis', () => {
    // Remove labs: botany via BIOE 117/117L is a comp course; use ENVS 162 + BIOE 120/120L? both labs.
    // Replace the comp-bearing courses: BIOE 117L, 135L, 122L are all comp courses.
    const t = edit(edit(edit(edit(base, 'BIOE 135', 'ENVS 162'), 'BIOE 135L', null), 'BIOE 122', 'BIOE 149'), 'BIOE 122L', null)
    const r = run(harness, { terms: t })
    expect(find(r, 'comprehensive').status).toBe('met') // BIOE 117L remains
  })

  it('lab/field: only one clear lab course is cannot-check, not met', () => {
    const t = edit(edit(edit(edit(base, 'BIOE 135', 'ENVS 162'), 'BIOE 135L', null), 'BIOE 122', 'BIOE 149'), 'BIOE 122L', null)
    const r = run(harness, { terms: t })
    expect(find(r, 'lab-field').status).toBe('cannot-check')
    expect(find(r, 'dc').status).toBe('met') // BIOE 108 + BIOE 145 / BIOE 117
  })

  it('adversarial: a lecture/lab combination counts as one course', () => {
    // BIOE 120L alone is not a topical elective
    expect(find(run(harness, { terms: edit(base, 'ENVS 160', 'BIOE 120L') }), 'topical').status).toBe('unmet')
    // ENVS 104L needs its concurrent ENVS 104A; together they are one topical elective
    expect(find(run(harness, { terms: edit(base, 'ENVS 160', 'ENVS 104L') }), 'topical').status).toBe('unmet')
    expect(find(run(harness, { terms: add(edit(base, 'ENVS 160', 'ENVS 104L'), '2290', 'ENVS 104A') }), 'topical').status).toBe('met')
  })

  it('adversarial: CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2272', 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('adversarial: two botany courses — one fills botany, the other a topical elective', () => {
    const t = add(edit(base, 'ENVS 160', 'BIOE 120'), '2290', 'BIOE 120L')
    const r = run(harness, { terms: t })
    expect(r.status).toBe('met')
  })
})
