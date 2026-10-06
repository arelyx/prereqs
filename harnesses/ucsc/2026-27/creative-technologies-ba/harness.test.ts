import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

type Terms = StudentRecord['terms']
const edit = (t: Terms, from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))

const base = plan(
  ['2268', 'ART 10D', 'MUSC 80L'],
  ['2270', 'FILM 20A'],
  ['2278', 'CT 1', 'CT 10', 'CT 100'],
  ['2280', 'CT 1', 'CT 11', 'CT 101'],
  ['2282', 'CT 1', 'CT 20', 'CT 120'],
  ['2288', 'CT 125', 'HAVC 141N'],
  ['2290', 'CT 151', 'CT 167Q'],
  ['2292', 'CT 195'],
)
const B = { breadth1: 'ART 10D', breadth2: 'MUSC 80L', breadth3: 'HAVC 141N' }

describe('creative-technologies-ba 2026-27', () => {
  it('complete record with declared breadth electives', () => {
    const r = run(harness, { terms: base, choices: B })
    expect(failing(r)).toEqual([])
    expect(r.status).toBe('met')
  })

  it('undeclared breadth electives cannot be checked (never met)', () => {
    const r = run(harness, { terms: base })
    expect(find(r, 'breadth').status).toBe('cannot-check')
    expect(r.status).toBe('cannot-check')
  })

  it('three quarters of CT 1 are required', () => {
    const t = edit(base, 'CT 1', null).map((q, i) => (i === 2 ? { ...q, courses: [...q.courses, 'CT 1'] } : q))
    expect(find(run(harness, { terms: t, choices: B }), 'ct1').status).toBe('unmet')
  })

  it('at least one breadth elective must be upper-division', () => {
    const t = edit(base, 'HAVC 141N', 'ART 15')
    const r = run(harness, { terms: t, choices: { ...B, breadth3: 'ART 15' } })
    expect(find(r, 'breadth/upper').status).toBe('unmet')
  })

  it('a breadth elective must be in the plan, distinct, and not a CT requirement course', () => {
    expect(find(run(harness, { terms: base, choices: { ...B, breadth3: 'ART 104' } }), 'breadth/3').status).toBe('unmet')
    expect(find(run(harness, { terms: base, choices: { ...B, breadth3: 'ART 10D' } }), 'breadth/3').status).toBe('unmet')
    expect(find(run(harness, { terms: base, choices: { ...B, breadth3: 'CT 167Q' } }), 'breadth/3').status).toBe('unmet')
  })

  it('a second special topics course may be a breadth elective if on the list', () => {
    const t = base.map((q, i) => (i === 7 ? { ...q, courses: [...q.courses, 'CT 167S'] } : q))
    expect(failing(run(harness, { terms: t, choices: { ...B, breadth3: 'CT 167S' } }))).toEqual([])
  })

  it('special topics course required', () => {
    expect(find(run(harness, { terms: edit(base, 'CT 167Q', null), choices: B }), 'special-topics').status).toBe('unmet')
  })

  it('CT 195 is core, DC and comprehensive', () => {
    const r = run(harness, { terms: edit(base, 'CT 195', null), choices: B })
    expect(find(r, 'ud-core').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('P grades count', () => {
    expect(failing(run(harness, { terms: base, choices: B, grades: { 'CT 101': 'P' } }))).toEqual([])
  })
})
