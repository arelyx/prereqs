import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

const terms = plan(
  ['2268', 'FILM 20A', 'FILM 20C'],
  ['2278', 'FILM 132A', 'FILM 134B'],
  ['2280', 'FILM 136D', 'FILM 120'],
  ['2282', 'FILM 165A', 'FILM 194B'],
)
const swap = (t: typeof terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

describe('film-and-digital-media-minor 2026-27', () => {
  it('complete record', () => {
    expect(failing(run(harness, { terms }))).toEqual([])
  })

  it('production studios do not count as electives', () => {
    for (const p of ['FILM 150', 'FILM 151', 'FILM 170A', 'FILM 179B'])
      expect(find(run(harness, { terms: swap(terms, 'FILM 165A', p) }), 'electives').status).toBe('unmet')
  })

  it('FILM 185F (2 credits) does not count; FILM 185D does', () => {
    expect(find(run(harness, { terms: swap(terms, 'FILM 165A', 'FILM 185F') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'FILM 165A', 'FILM 185D') }), 'electives').status).toBe('met')
  })

  it('a second core-group course may be an elective, but a core course cannot fill both', () => {
    expect(find(run(harness, { terms: swap(terms, 'FILM 165A', 'FILM 132B') }), 'electives').status).toBe('met')
    const r = run(harness, { terms: swap(terms, 'FILM 165A', null) })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'core-g1').status).toBe('met')
  })

  it('every one of the three groups is required (Group 4 is not part of the minor)', () => {
    expect(find(run(harness, { terms: swap(terms, 'FILM 136D', 'FILM 170A') }), 'core-g3').status).toBe('unmet')
  })

  it('needs FILM 20B or 20C; FILM 20P does not count', () => {
    expect(find(run(harness, { terms: swap(terms, 'FILM 20C', 'FILM 20P') }), 'film20bc').status).toBe('unmet')
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms, grades: { 'FILM 20A': 'P', 'FILM 194B': 'P' } }))).toEqual([])
  })

  it('review: FILM 20B and 20C together do not make an elective; FILM 195/199 are not electives', () => {
    expect(find(run(harness, { terms: swap(terms, 'FILM 120', 'FILM 20B') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'FILM 120', 'FILM 195') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(terms, 'FILM 120', 'FILM 199') }), 'electives').status).toBe('unmet')
  })

  it('review: FILM 152 and the FILM 194 series count; empty plan fails every slot', () => {
    expect(find(run(harness, { terms: swap(terms, 'FILM 120', 'FILM 152') }), 'electives').status).toBe('met')
    expect(failing(run(harness, { terms: [] }))).toHaveLength(6)
  })

})
