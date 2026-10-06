import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import type { StudentRecord } from '@harness'
import harness from './harness'

const lower = plan(
  ['2268', 'MATH 19A', 'PHYS 5A', 'PHYS 5L', 'CHEM 3A'],
  ['2270', 'MATH 19B', 'PHYS 5B', 'PHYS 5M', 'CSE 20'],
  ['2272', 'MATH 23A', 'PHYS 5C', 'PHYS 5N'],
  ['2278', 'MATH 23B', 'PHYS 5D'],
)
const standard = [
  ...lower,
  ...plan(
    ['2280', 'PHYS 102', 'PHYS 116A'],
    ['2282', 'PHYS 116C', 'PHYS 105'],
    ['2288', 'PHYS 110A', 'PHYS 133'],
    ['2290', 'PHYS 110B', 'PHYS 112', 'PHYS 182'],
    ['2292', 'PHYS 134', 'PHYS 115', 'ECE 101'],
    ['2298', 'ECE 141'],
  ),
]
const computational = [
  ...lower.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CHEM 3A') })),
  ...plan(
    ['2280', 'PHYS 102', 'PHYS 116A', 'CSE 30'],
    ['2282', 'PHYS 116C', 'PHYS 105'],
    ['2288', 'PHYS 110A', 'STAT 131'],
    ['2290', 'PHYS 112', 'PHYS 115', 'PHYS 182'],
    ['2292', 'PHYS 152', 'AM 148', 'EART 124'],
  ),
]
const edit = (t: StudentRecord['terms'], from: string, to: string | null) =>
  t.map((q) => ({ ...q, courses: q.courses.flatMap((c) => (c === from ? (to ? [to] : []) : [c])) }))
const std = { concentration: 'standard' }
const cp = { concentration: 'Computational Physics' }

describe('applied-physics-bs 2025-26', () => {
  it('asks for the path first', () => {
    expect(find(run(harness, { terms: standard }), 'choice:concentration').status).toBe('needs-choice')
  })

  it('complete standard record', () => {
    expect(failing(run(harness, { terms: standard, choices: std }))).toEqual([])
  })

  it('complete computational record', () => {
    expect(failing(run(harness, { terms: computational, choices: cp }))).toEqual([])
  })

  it('standard electives need a Physics Department course', () => {
    const t = edit(standard, 'PHYS 115', 'ECE 130')
    const n = find(run(harness, { terms: t, choices: std }), 'electives')
    expect(n.status).toBe('unmet')
    expect(n.detail).toMatch(/Physics Department/)
  })

  it('ECE 135/135L may replace PHYS 110A+110B (standard)', () => {
    const t = edit(edit(standard, 'PHYS 110A', 'ECE 135'), 'PHYS 110B', 'ECE 135L')
    expect(find(run(harness, { terms: t, choices: std }), 'phys110').status).toBe('met')
    expect(find(run(harness, { terms: edit(standard, 'PHYS 110B', 'ECE 135'), choices: std }), 'phys110').status).toBe('unmet')
  })

  it('MATH 21 + MATH 24 substitute for PHYS 116A', () => {
    const t = edit(standard, 'PHYS 116A', 'MATH 21').map((q) => (q.term === '2298' ? { ...q, courses: [...q.courses, 'MATH 24'] } : q))
    expect(find(run(harness, { terms: t, choices: std }), 'phys116a').status).toBe('met')
  })

  it('PHYS 116C waiver needs MATH 107 and the math dual major', () => {
    const t = edit(standard, 'PHYS 116C', 'MATH 107')
    expect(find(run(harness, { terms: t, choices: std }), 'phys116c').status).toBe('met')
    expect(find(run(harness, { terms: t, choices: std, attested: [] }), 'phys116c').status).toBe('needs-attestation')
    expect(find(run(harness, { terms: edit(standard, 'PHYS 116C', null), choices: std }), 'phys116c').status).toBe('unmet')
  })

  it('letter grades required, except chemistry', () => {
    expect(find(run(harness, { terms: standard, choices: std, grades: { 'CHEM 3A': 'P' } }), 'chem').status).toBe('met')
    expect(find(run(harness, { terms: standard, choices: std, grades: { 'PHYS 102': 'P' } }), 'phys102').status).toBe('unmet')
  })

  it('2025-26: CHEM 1A or CHEM 1B can substitute for CHEM 3A', () => {
    expect(find(run(harness, { terms: edit(standard, 'CHEM 3A', 'CHEM 1A'), choices: std }), 'chem').status).toBe('met')
    expect(find(run(harness, { terms: edit(standard, 'CHEM 3A', 'CHEM 1B'), choices: std }), 'chem').status).toBe('met')
    expect(find(run(harness, { terms: edit(standard, 'CHEM 3A', null), choices: std }), 'chem').status).toBe('unmet')
  })

  it('DC: PHYS 182, or both PHYS 195A and 195B', () => {
    const t = edit(standard, 'PHYS 182', 'PHYS 195A')
    expect(find(run(harness, { terms: t, choices: std }), 'dc').status).toBe('unmet')
    const both = t.map((q) => (q.term === '2298' ? { ...q, courses: [...q.courses, 'PHYS 195B'] } : q))
    expect(find(run(harness, { terms: both, choices: std }), 'dc').status).toBe('met')
  })

  it('computational: at least one of PHYS 150/152', () => {
    const t = edit(computational, 'PHYS 152', 'BME 205')
    expect(find(run(harness, { terms: t, choices: cp }), 'electives').status).toBe('unmet')
  })

  it('computational: at most one of PHYS 110B and PHYS 139A', () => {
    const t = edit(edit(computational, 'AM 148', 'PHYS 110B'), 'EART 124', 'PHYS 139A')
    expect(find(run(harness, { terms: t, choices: cp }), 'electives').status).toBe('unmet')
  })

  it('computational needs CSE 20 and CSE 30 (no chemistry)', () => {
    const r = run(harness, { terms: edit(computational, 'CSE 30', null), choices: cp })
    expect(find(r, 'programming').status).toBe('unmet')
  })

  it('comprehensive: PHYS 134 (standard) / PHYS 115 (computational)', () => {
    expect(find(run(harness, { terms: edit(standard, 'PHYS 134', null), choices: std }), 'comprehensive').status).toBe('unmet')
    expect(find(run(harness, { terms: computational, choices: cp }), 'comprehensive').status).toBe('met')
  })
})
