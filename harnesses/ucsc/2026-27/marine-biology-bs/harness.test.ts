import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

// A frosh starting fall 2026 (CHEM 3B/3C include lab).
// UD (11): BIOE 106, BIOE 109 | BIOE 107 | OCEA 101 | BIOE 120+120L (marine)
// topical: BIOE 108, BIOE 127+127L, BIOE 161L | general: BIOE 140, BIOL 100, METX 100
// lab/field: 120L, 127L, 161L · DC: BIOE 108 + BIOE 120/120L · comprehensive: 161L
const base = plan(
  ['2268', 'BIOL 20A', 'CHEM 3A', 'MATH 16A'],
  ['2270', 'BIOE 20B', 'CHEM 3B', 'MATH 16B'],
  ['2272', 'BIOE 20C', 'CHEM 3C', 'STAT 7', 'STAT 7L'],
  ['2278', 'PHYS 6A', 'PHYS 6L', 'BIOE 107'],
  ['2280', 'PHYS 6B', 'BIOE 106'],
  ['2282', 'BIOE 109', 'OCEA 101'],
  ['2288', 'BIOE 120', 'BIOE 120L', 'BIOE 108'],
  ['2290', 'BIOE 127', 'BIOE 127L', 'BIOE 140'],
  ['2292', 'BIOE 161L', 'BIOL 100'],
  ['2298', 'METX 100'],
)
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: StudentRecord['terms'], term: string, ...cs: string[]) =>
  t.map((q) => (q.term === term ? { ...q, courses: [...q.courses, ...cs] } : q))

describe('marine-biology-bs 2026-27', () => {
  it('complete record', () => {
    const r = run(harness, { terms: base })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
    expect(find(r, 'lab-field').status).toBe('met')
  })

  it('CHEM 3B/3C before fall 2026 need CHEM 3BL/3CL', () => {
    const early = base.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(early, '2262', 'CHEM 3BL', 'CHEM 3CL') }), 'gen-chem').status).toBe('met')
  })

  it('CHEM 4 series needs both labs', () => {
    const t = edit(edit(edit(base, 'CHEM 3A', 'CHEM 4A'), 'CHEM 3B', 'CHEM 4B'), 'CHEM 3C', 'CHEM 4AL')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, '2272', 'CHEM 4BL') }), 'gen-chem').status).toBe('met')
  })

  it('math must be one listed series; a mixed 11/19 series is cannot-check, 16/19 is unmet', () => {
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 16A', 'MATH 19A'), 'MATH 16B', 'MATH 19B') }), 'math').status).toBe('met')
    expect(find(run(harness, { terms: edit(edit(base, 'MATH 16A', 'MATH 11A'), 'MATH 16B', 'MATH 19B') }), 'math').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'MATH 16A', 'MATH 19A') }), 'math').status).toBe('unmet')
  })

  it('physics: 6A + 6L + 6C works; missing 6L fails', () => {
    expect(find(run(harness, { terms: edit(base, 'PHYS 6B', 'PHYS 6C') }), 'physics').status).toBe('met')
    expect(find(run(harness, { terms: edit(base, 'PHYS 6L', 'PHYS 6M') }), 'physics').status).toBe('unmet')
  })

  it('STAT 5 instead of STAT 7/7L: met for a transfer (transfer list option), cannot-check for frosh', () => {
    const t = edit(edit(base, 'STAT 7', 'STAT 5'), 'STAT 7L', null)
    expect(find(run(harness, { terms: t, entry: 'transfer' }), 'biostat').status).toBe('met')
    expect(find(run(harness, { terms: t }), 'biostat').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(base, 'STAT 7L', null) }), 'biostat').status).toBe('unmet')
  })

  it('BIOL 105 may replace BIOE 106', () => {
    expect(run(harness, { terms: edit(base, 'BIOE 106', 'BIOL 105') }).status).toBe('met')
  })

  it('a lecture with a required concurrent lab needs the lab (BIOE 120 without 120L)', () => {
    const r = run(harness, { terms: edit(base, 'BIOE 120L', null) })
    expect(r.status).toBe('unmet')
    for (const id of ['marine', 'topical', 'general']) expect(find(r, id).used?.map((e) => e.code)).not.toContain('BIOE120')
  })

  it('BIOE 129 lab is optional for the marine course but required for DC credit', () => {
    // swap marine course to BIOE 129 alone; DC then has BIOE 108 only + BIOE 127/127L (in topical) → still 2
    const t = edit(edit(base, 'BIOE 120', 'BIOE 129'), 'BIOE 120L', null)
    const r = run(harness, { terms: t })
    expect(find(r, 'marine').status).toBe('met')
    expect(find(r, 'dc').status).toBe('met') // BIOE 108 + BIOE 127/127L
    // Without BIOE 127/127L (replaced by a non-DC topical), BIOE 129 alone gives no DC credit
    const t2 = edit(edit(edit(t, 'BIOE 127', 'BIOE 165'), 'BIOE 127L', null), 'BIOE 161L', 'BIOE 155L')
    const r2 = run(harness, { terms: t2 })
    expect(find(r2, 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t2, '2288', 'BIOE 129L') }), 'dc').status).toBe('met')
  })

  it('a course counts toward only one requirement group (BIOE 108 as ecology and topical)', () => {
    // BIOE 108 for ecology instead of BIOE 107: topical then lacks a third course
    const r = run(harness, { terms: edit(base, 'BIOE 107', null) })
    expect(r.status).toBe('unmet')
    expect(failing(r).some((x) => x.startsWith('ecology') || x.startsWith('topical'))).toBe(true)
  })

  it('OCEA 130 can be the marine-environment course or a topical, not both', () => {
    const r = run(harness, { terms: edit(base, 'OCEA 101', 'OCEA 130') })
    expect(r.status).toBe('met')
    // OCEA 130 as marine-environment AND in place of a topical (BIOE 161L) → one short
    const t = add(edit(edit(base, 'OCEA 101', 'OCEA 130'), 'BIOE 161L', null), '2292', 'BIOE 183W')
    expect(find(run(harness, { terms: t }), 'topical').status).toBe('unmet')
  })

  it('general BIOE elective must be 5+ credits and BIOE 100–179', () => {
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'BIOE 131L') }), 'general').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'BIOE 188') }), 'general').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(base, 'BIOE 140', 'PSYC 123') }), 'general').status).toBe('met')
  })

  it('5 credits of undergraduate research may be one general elective, at most one', () => {
    const t = edit(base, 'BIOE 140', 'BIOE 183W')
    expect(find(run(harness, { terms: t }), 'general').status).toBe('unmet') // 2 credits only
    expect(find(run(harness, { terms: add(t, '2298', 'BIOE 183L') }), 'general').status).toBe('met')
    const two = add(edit(edit(base, 'BIOE 140', 'BIOE 195'), 'METX 100', 'ENVS 183'), '2298')
    expect(find(run(harness, { terms: two }), 'general').status).toBe('unmet')
  })

  it('two upper-division courses must include lab or fieldwork', () => {
    // Replace 127/127L with BIOE 126 and BIOE 161L with BIOE 165: only 120L remains
    const t = edit(edit(edit(base, 'BIOE 127', 'BIOE 126'), 'BIOE 127L', null), 'BIOE 161L', 'BIOE 165')
    const r = run(harness, { terms: add(t, '2298', 'BIOE 183W') }) // keep comprehensive met
    expect(find(r, 'lab-field').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
  })

  it('DC needs two courses from the list; NRS/BIOL 188 half credit is cannot-check', () => {
    // BIOE 120 → BIOE 126 (DC list) keeps DC; BIOE 108 → BIOE 165 as topical removes one DC
    const t = edit(base, 'BIOE 108', 'BIOE 165')
    const r = run(harness, { terms: t })
    expect(find(r, 'dc').status).toBe('met') // BIOE 120/120L + BIOE 127/127L
    const t2 = edit(edit(edit(t, 'BIOE 127', 'BIOE 136'), 'BIOE 127L', null), 'BIOE 161L', 'BIOE 155L')
    expect(find(run(harness, { terms: t2 }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t2, '2290', 'BIOL 188') }), 'dc').status).toBe('cannot-check')
  })

  it('comprehensive: a listed field/lab course, research, or thesis; P counts only if P/NP-only', () => {
    // 161L → BIOE 155 (topical, not comprehensive); 120L and 127L are comprehensive anyway
    const r = run(harness, { terms: edit(base, 'BIOE 161L', 'BIOE 155') })
    expect(find(r, 'comprehensive').status).toBe('met')
    // Remove every comprehensive lab: marine BIOE 126, topical 129 (no lab), 155
    const none = edit(edit(edit(edit(edit(base, 'BIOE 120', 'BIOE 126'), 'BIOE 120L', null), 'BIOE 127', 'BIOE 129'), 'BIOE 127L', null), 'BIOE 161L', 'BIOE 155')
    expect(find(run(harness, { terms: none }), 'comprehensive').status).toBe('unmet')
    const thesis = add(none, '2298', 'BIOE 195')
    expect(find(run(harness, { terms: thesis }), 'comprehensive').status).toBe('met')
    expect(find(run(harness, { terms: thesis, grades: { 'BIOE 195': 'P' } }), 'comprehensive').status).toBe('cannot-check')
  })

  it('letter grades are required', () => {
    expect(find(run(harness, { terms: base, grades: { 'BIOE 109': 'P' } }), 'core-evolution').status).toBe('unmet')
  })
  it('optional BIOE 129L with BIOE 129 makes it a lab course; ENVS 104A+104L count once', () => {
    // base lab/field: 120L, 127L, 161L. Drop 127L-pair and 161L → only 120L.
    const one = edit(edit(edit(base, 'BIOE 127', 'BIOE 129'), 'BIOE 127L', null), 'BIOE 161L', 'BIOE 165')
    expect(find(run(harness, { terms: one }), 'lab-field').status).toBe('unmet')
    expect(find(run(harness, { terms: add(one, '2290', 'BIOE 129L') }), 'lab-field').status).toBe('met')
    // ENVS 104A + 104L as a general elective (in place of METX 100) → one lab/field course
    const envs = add(edit(one, 'METX 100', 'ENVS 104A'), '2298', 'ENVS 104L')
    const r = run(harness, { terms: envs })
    expect(find(r, 'general').status).toBe('met')
    expect(find(r, 'lab-field').status).toBe('met')
    // ENVS 104A without its required lab does not count
    expect(find(run(harness, { terms: edit(one, 'METX 100', 'ENVS 104A') }), 'general').status).toBe('unmet')
  })

  it('undergraduate research as the second lab/field course is cannot-check', () => {
    const one = edit(edit(edit(base, 'BIOE 127', 'BIOE 129'), 'BIOE 127L', null), 'BIOE 161L', 'BIOE 165')
    const t = add(edit(one, 'METX 100', 'BIOE 183W'), '2298', 'BIOE 183L')
    const r = run(harness, { terms: t })
    expect(find(r, 'general').status).toBe('met')
    expect(find(r, 'lab-field').status).toBe('cannot-check')
  })
})
