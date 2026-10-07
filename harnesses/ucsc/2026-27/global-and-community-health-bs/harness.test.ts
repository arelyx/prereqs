import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const add = (t: Terms, ...cs: string[]) => [...t, { term: '2298', courses: cs }]

const biomed = plan(
  ['2268', 'GCH 1', 'BIOL 20A', 'CHEM 3A', 'MATH 19A', 'SPAN 1'],
  ['2270', 'BIOE 20B', 'BIOL 20L', 'CHEM 3B', 'MATH 19B', 'SPAN 2'],
  ['2272', 'CHEM 3C', 'STAT 7', 'STAT 7L', 'SPAN 3'],
  ['2278', 'CHEM 8A', 'CHEM 8L', 'PHYS 6A', 'PHYS 6L', 'SPAN 4'],
  ['2280', 'CHEM 8B', 'CHEM 8M', 'PHYS 6B', 'SPAN 5M'],
  ['2282', 'PHYS 6C', 'BIOL 100'],
  ['2288', 'BIOL 101', 'BIOL 105', 'METX 115'],
  ['2290', 'BIOL 110', 'BIOL 113', 'GCH 190'],
  ['2292', 'BIOL 130', 'BIOL 130L', 'GCH 195', 'BIOL 189'],
)
const BIO = { concentration: 'biomedical' }

const pch = plan(
  ['2268', 'GCH 1', 'BIOL 20A', 'CHEM 3A', 'MATH 16A', 'SOCY 1'],
  ['2270', 'BIOE 20B', 'BIOL 20L', 'CHEM 3B', 'MATH 16B'],
  ['2272', 'CHEM 3C', 'STAT 7', 'STAT 7L', 'METX 41'],
  ['2278', 'CHEM 8A', 'CHEM 8L'],
  ['2280', 'CHEM 8B', 'CHEM 8M'],
  ['2282', 'BIOL 100', 'METX 115'],
  ['2288', 'BIOL 113', 'METX 108', 'METX 133'],
  ['2290', 'GCH 190', 'CMMU 160', 'SOCY 121'],
  ['2292', 'GCH 195', 'BIOL 189'],
)
const PCH = { concentration: 'public-community' }

describe('global-and-community-health-bs 2026-27 — biomedical', () => {
  it('complete record', () => {
    const r = run(harness, { terms: biomed, choices: BIO })
    expect(failing(r)).toEqual([])
    expect(find(r, 'dc').status).toBe('met')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('needs a concentration', () => {
    expect(run(harness, { terms: biomed }).nodes[0].status).toBe('needs-choice')
  })

  it('Spanish: placement past SPAN 1-2 needs the equivalence attestation; missing SPAN 4 fails', () => {
    const placed = edit(edit(biomed, 'SPAN 1', null), 'SPAN 2', null)
    expect(find(run(harness, { terms: placed, choices: BIO }), 'span-1-4').status).toBe('met')
    expect(find(run(harness, { terms: placed, choices: BIO, attested: [] }), 'span-1-4').status).toBe('needs-attestation')
    const no4 = edit(edit(biomed, 'SPAN 4', null), 'SPAN 5M', null)
    expect(find(run(harness, { terms: no4, choices: BIO }), 'span-1-4').status).toBe('unmet')
  })

  it('SPAN 5M is required', () => {
    expect(find(run(harness, { terms: edit(biomed, 'SPAN 5M', null), choices: BIO }), 'span5m').status).toBe('unmet')
  })

  it('BIOL 130L and physics lab are required', () => {
    expect(find(run(harness, { terms: edit(biomed, 'BIOL 130L', null), choices: BIO }), 'ud-core').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(biomed, 'PHYS 6L', null), choices: BIO }), 'physics').status).toBe('unmet')
  })

  it('CHEM 3B/3C before fall 2026 need labs', () => {
    const early = biomed.map((q) => ({ ...q, term: String(Number(q.term) - 10) }))
    expect(find(run(harness, { terms: early, choices: BIO }), 'gen-chem').status).toBe('unmet')
  })

  it('internship BIOL 189 is the comprehensive requirement', () => {
    const r = run(harness, { terms: edit(biomed, 'BIOL 189', null), choices: BIO })
    expect(find(r, 'internship').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
    const f = run(harness, { terms: biomed, choices: BIO, grades: { 'BIOL 189': 'F' } })
    expect(find(f, 'comprehensive').status).toBe('unmet')
  })

  it('letter grades required', () => {
    expect(find(run(harness, { terms: biomed, choices: BIO, grades: { 'BIOL 110': 'P' } }), 'ud-core').status).toBe('unmet')
  })

  it('MATH 19A + MATH 11B transition is fine; MATH 16A + 19B is not', () => {
    expect(find(run(harness, { terms: edit(biomed, 'MATH 19B', 'MATH 11B'), choices: BIO }), 'calc').status).toBe('met')
    expect(find(run(harness, { terms: edit(biomed, 'MATH 19A', 'MATH 16A'), choices: BIO }), 'calc').status).toBe('unmet')
  })

  it('STAT 5 before UCSC: petition waiver', () => {
    const t = edit(edit(biomed, 'STAT 7', null), 'STAT 7L', null)
    expect(find(run(harness, { terms: t, choices: BIO }), 'stats').status).toBe('unmet')
    expect(find(run(harness, { terms: t, choices: BIO, completed: ['STAT 5'] }), 'stats').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: BIO, completed: ['STAT 5'], attested: [] }), 'stats').status).toBe('needs-attestation')
    // a UCSC STAT 5 does not qualify
    expect(find(run(harness, { terms: add(t, 'STAT 5'), choices: BIO }), 'stats').status).toBe('unmet')
  })

  it('BIOL 20L: community-college waiver cannot be checked', () => {
    const t = edit(edit(edit(biomed, 'BIOL 20L', null), 'BIOL 20A', null), 'BIOE 20B', null)
    const r = run(harness, { terms: t, choices: BIO, completed: ['BIOL 20A', 'BIOE 20B'] })
    expect(find(r, 'biol20l').status).toBe('cannot-check')
    expect(find(run(harness, { terms: edit(biomed, 'BIOL 20L', null), choices: BIO }), 'biol20l').status).toBe('unmet')
  })
})

describe('global-and-community-health-bs 2026-27 — public and community health', () => {
  it('complete record', () => {
    const r = run(harness, { terms: pch, choices: PCH })
    expect(failing(r)).toEqual([])
  })

  it('Physiology of Disease (METX 41) is required', () => {
    expect(find(run(harness, { terms: edit(pch, 'METX 41', null), choices: PCH }), 'physiology').status).toBe('unmet')
  })

  it('breadth, STEM and two non-STEM electives', () => {
    expect(find(run(harness, { terms: edit(pch, 'SOCY 1', null), choices: PCH }), 'breadth').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(pch, 'METX 133', null), choices: PCH }), 'stem').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(pch, 'SOCY 121', null), choices: PCH }), 'non-stem').status).toBe('unmet')
  })

  it('METX 135 needs METX 135L', () => {
    const t = edit(pch, 'METX 133', 'METX 135')
    expect(find(run(harness, { terms: t, choices: PCH }), 'stem').status).toBe('unmet')
    expect(find(run(harness, { terms: add(t, 'METX 135L'), choices: PCH }), 'stem').status).toBe('met')
  })

  it('CMMU 165 or METX 108 required', () => {
    expect(find(run(harness, { terms: edit(pch, 'METX 108', null), choices: PCH }), 'community-analysis').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(pch, 'METX 108', 'CMMU 165'), choices: PCH }), 'community-analysis').status).toBe('met')
  })

  it('no Spanish or physics requirement', () => {
    const r = run(harness, { terms: pch, choices: PCH })
    expect(() => find(r, 'spanish')).toThrow()
    expect(() => find(r, 'physics')).toThrow()
  })

  it('DC needs GCH 190 and GCH 195', () => {
    const r = run(harness, { terms: edit(pch, 'GCH 190', null), choices: PCH })
    expect(find(r, 'dc').status).toBe('unmet')
  })
})

describe('global-and-community-health-bs 2026-27 — review 2026-10-06', () => {
  it('the STAT 5 petition is not offered when STAT 7 + 7L are in the plan', () => {
    const r = run(harness, { terms: biomed, completed: ['STAT 5'], choices: BIO, attested: [] })
    expect(() => find(r, 'attest:stat5-waiver')).toThrow()
    expect(failing(r)).toEqual([])
  })

  // "receiving a passing grade in the Health Sciences Internship, BIOL 189" vs the letter-grade policy
  it('BIOL 189 taken P/NP cannot be decided', () => {
    const r = run(harness, { terms: biomed, choices: BIO, grades: { 'BIOL 189': 'P' } })
    expect(find(r, 'internship').status).toBe('cannot-check')
    expect(find(r, 'comprehensive').status).toBe('cannot-check')
    expect(find(run(harness, { terms: biomed, choices: BIO, grades: { 'BIOL 189': 'NP' } }), 'internship').status).toBe('unmet')
  })

  it('SPAN 5M alone (placement past SPAN 4) asks for the equivalence attestation', () => {
    const t = ['SPAN 1', 'SPAN 2', 'SPAN 3', 'SPAN 4'].reduce((acc, c) => edit(acc, c, null), biomed)
    expect(find(run(harness, { terms: t, choices: BIO, attested: [] }), 'span-1-4').status).toBe('needs-attestation')
  })

  it('a retaken non-STEM elective counts once; METX 135L alone is not a STEM elective', () => {
    expect(find(run(harness, { terms: add(edit(pch, 'SOCY 121', null), 'CMMU 160'), choices: PCH }), 'non-stem').status).toBe('unmet')
    expect(find(run(harness, { terms: edit(pch, 'METX 133', 'METX 135L'), choices: PCH }), 'stem').status).toBe('unmet')
  })
})
