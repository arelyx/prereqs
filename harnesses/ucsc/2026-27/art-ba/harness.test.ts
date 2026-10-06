import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

// 8 lower-division + 7 studios (incl. ART 190B) + ART 190A.
const terms = plan(
  ['2268', 'ART 10D', 'ART 20G', 'HAVC 30'],
  ['2270', 'ART 10E', 'ART 20H', 'ART 80T'],
  ['2272', 'ART 20I', 'HAVC 22'],
  ['2278', 'ART 106A', 'ART 110'],
  ['2280', 'ART 130', 'ART 131'],
  ['2282', 'ART 150', 'ART 194'],
  ['2290', 'ART 190A'],
  ['2292', 'ART 190B'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('art-ba 2026-27', () => {
  it('complete record (ART 190B is a studio and the comprehensive option)', () => {
    expect(failing(run(harness, { terms, attested: [] }))).toEqual([])
  })

  it('without ART 190B, six studios + 190A fail even with the review attested', () => {
    const r = run(harness, { terms: swap(terms, 'ART 190B', null) })
    expect(find(r, 'studios').status).toBe('unmet')
    expect(find(r, 'comp-option').status).toBe('met')
  })

  it('exhibition/portfolio review needs seven other studios and is an attestation', () => {
    const t = swap(terms, 'ART 190B', 'ART 135')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    expect(find(run(harness, { terms: t, attested: [] }), 'comp-option').status).toBe('needs-attestation')
  })

  it('needs two foundation courses (frosh cannot use the portfolio review)', () => {
    const r = run(harness, { terms: swap(terms, 'ART 10E', null), entry: 'frosh' })
    expect(find(r, 'foundation').status).toBe('unmet')
  })

  it('a transfer student who passed the portfolio review has the foundations waived', () => {
    const t = swap(swap(terms, 'ART 10E', null), 'ART 10D', null)
    expect(find(run(harness, { terms: t, entry: 'transfer', attested: ['portfolio review'] }), 'foundation-or-portfolio').status).toBe('met')
    expect(find(run(harness, { terms: t, entry: 'transfer', attested: [] }), 'foundation-or-portfolio').status).toBe('needs-attestation')
  })

  it('HAVC: two Europe/Americas courses do not cover the other-regions requirement', () => {
    const r = run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 135B') })
    expect(find(r, 'havc-other').status).toBe('unmet')
  })

  it('HAVC 80 and upper-division regional courses count for other regions; HAVC 180-189 does not', () => {
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 80') }), 'havc-other').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 151') }), 'havc-other').status).toBe('met')
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', 'HAVC 185') }), 'havc-other').status).toBe('unmet')
  })

  it('ART 190A is required (DC and comprehensive)', () => {
    const r = run(harness, { terms: swap(terms, 'ART 190A', null) })
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comp-190a').status).toBe('unmet')
  })

  it('a C- in an art course does not count; P does', () => {
    expect(find(run(harness, { terms, grades: { 'ART 80T': 'C-' } }), 'art80t').status).toBe('unmet')
    expect(find(run(harness, { terms, grades: { 'ART 80T': 'P' } }), 'art80t').status).toBe('met')
  })

  it('ART 191/192/197 are not studios; a repeated repeatable studio counts twice', () => {
    expect(find(run(harness, { terms: swap(terms, 'ART 150', 'ART 192') }), 'studios').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'ART 150', 'ART 106A') }), 'studios').status).toBe('met')
  })

  it('needs three ART 20 courses', () => {
    expect(find(run(harness, { terms: swap(terms, 'ART 20I', 'ART 10F') }), 'intro').status).toBe('unmet')
  })
  it('review: AP Art History 3+ stands for Europe and the Americas only when no such course is in the plan', () => {
    const t = swap(terms, 'HAVC 30', null)
    expect(find(run(harness, { terms: t, attested: [] }), 'havc-europe-or-ap').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: t, attested: ['AP Art History'] }), 'havc-europe-or-ap').status).toBe('met')
    // the exam never covers the other-regions course
    expect(find(run(harness, { terms: swap(terms, 'HAVC 22', null), attested: ['AP Art History'] }), 'havc-other').status).toBe('unmet')
    // with a Europe/Americas course the exam is not asked
    expect(() => find(run(harness, { terms, attested: [] }), 'havc-europe-or-ap')).toThrow()
  })

  it('review: the portfolio waiver is not asked of a transfer student who has the foundations', () => {
    const r = run(harness, { terms, entry: 'transfer', attested: [] })
    expect(failing(r)).toEqual([])
    expect(find(r, 'foundation').status).toBe('met')
  })

  it('review: a planned Europe/Americas course is in progress, not waived', () => {
    const r = run(harness, { terms, currentTerm: '2268', attested: [] })
    expect(find(r, 'havc-europe').status).toBe('in-progress')
  })
})
